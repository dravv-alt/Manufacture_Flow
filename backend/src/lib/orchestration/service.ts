import { and, eq, inArray } from "drizzle-orm";
import { evaluateAllocationPolicy } from "@/lib/agents/recovery-orchestrator";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, productionJobs, workstationAllocationLocks, workstations, workflowEvents } from "@/lib/db/schema";

export class RecoveryOrchestrationNotFoundError extends Error {}
export class WorkstationAllocationLockedError extends Error {}

export async function applyRecoveryAllocationLock(input: { predictionId: string; correlationId: string }) {
  const [prediction] = await db.select({
    id: failurePredictions.id,
    severity: failurePredictions.severity,
    probability: failurePredictions.probability,
    ttfHours: failurePredictions.ttfHours,
    workstationId: failurePredictions.workstationId,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
  }).from(failurePredictions)
    .innerJoin(failureCases, eq(failurePredictions.failureCaseId, failureCases.id))
    .where(eq(failurePredictions.id, input.predictionId))
    .limit(1);
  if (!prediction) throw new RecoveryOrchestrationNotFoundError(`Failure prediction ${input.predictionId} was not found.`);

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "RecoveryOrchestratorAgent",
    status: "running",
    workstationId: prediction.workstationId,
    correlationId: input.correlationId,
    sourceEventId: prediction.id,
    input: { failurePredictionId: prediction.id, failureCaseId: prediction.failureCaseExternalId, correlationId: input.correlationId },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [existingRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "RecoveryOrchestratorAgent"), eq(agentRuns.sourceEventId, prediction.id))).limit(1);
    const [existingLock] = await db.select().from(workstationAllocationLocks).where(eq(workstationAllocationLocks.workstationId, prediction.workstationId)).limit(1);
    return { idempotent: true, agentRun: existingRun ?? null, allocationLock: existingLock ?? null, flaggedJobIds: [] as string[] };
  }

  try {
    const decision = evaluateAllocationPolicy(prediction);
    const result = await db.transaction(async (tx) => {
      const [workstation] = await tx.update(workstations)
        .set({ status: decision.workstationStatus, updatedAt: new Date() })
        .where(eq(workstations.id, prediction.workstationId))
        .returning();
      if (!workstation) throw new RecoveryOrchestrationNotFoundError(`Workstation for prediction ${prediction.id} was not found.`);

      if (!decision.shouldLockAllocation) {
        await tx.update(failureCases).set({ workflowState: "At risk / monitoring", updatedAt: new Date() }).where(eq(failureCases.id, prediction.failureCaseId));
        await tx.insert(workflowEvents).values({
          failureCaseId: prediction.failureCaseId,
          entityType: "workstation",
          entityId: prediction.workstationId,
          eventType: "workstation_marked_at_risk",
          actor: "Recovery Orchestrator Agent",
          payload: { correlationId: input.correlationId, failurePredictionId: prediction.id, policyReason: decision.reason },
        });
        return { workstation, allocationLock: null, flaggedJobs: [] as Array<{ id: string; externalId: string }> };
      }

      const [existingLock] = await tx.select().from(workstationAllocationLocks).where(eq(workstationAllocationLocks.workstationId, prediction.workstationId)).limit(1);
      const lockValues = {
        failureCaseId: prediction.failureCaseId,
        failurePredictionId: prediction.id,
        correlationId: input.correlationId,
        state: "active" as const,
        policyDisposition: decision.workstationStatus,
        reason: decision.reason,
        activatedAt: new Date(),
        releasedAt: null,
        updatedAt: new Date(),
      };
      const [allocationLock] = existingLock
        ? await tx.update(workstationAllocationLocks).set(lockValues).where(eq(workstationAllocationLocks.id, existingLock.id)).returning()
        : await tx.insert(workstationAllocationLocks).values({ workstationId: prediction.workstationId, ...lockValues }).returning();

      const flaggedJobs = await tx.update(productionJobs)
        .set({ rerouteEvaluationRequired: true, rerouteEvaluationReason: `Allocation lock ${allocationLock.id}: ${decision.reason}`, updatedAt: new Date() })
        .where(and(eq(productionJobs.workstationId, prediction.workstationId), inArray(productionJobs.state, ["queued", "in_flight"])))
        .returning({ id: productionJobs.id, externalId: productionJobs.externalId });
      await tx.update(failureCases).set({ workflowState: "Allocation lock active / reroute evaluation required", updatedAt: new Date() }).where(eq(failureCases.id, prediction.failureCaseId));
      await tx.insert(workflowEvents).values([
        {
          failureCaseId: prediction.failureCaseId,
          entityType: "workstation_allocation_lock",
          entityId: allocationLock.id,
          eventType: "workstation_allocation_lock_activated",
          actor: "Recovery Orchestrator Agent",
          payload: { correlationId: input.correlationId, failurePredictionId: prediction.id, workstationStatus: decision.workstationStatus, policyReason: decision.reason },
        },
        {
          failureCaseId: prediction.failureCaseId,
          entityType: "production_jobs",
          entityId: prediction.failureCaseId,
          eventType: "jobs_flagged_for_reroute_evaluation",
          actor: "Recovery Orchestrator Agent",
          payload: { correlationId: input.correlationId, allocationLockId: allocationLock.id, jobIds: flaggedJobs.map((job) => job.externalId) },
        },
      ]);
      return { workstation, allocationLock, flaggedJobs };
    });
    const output = { failurePredictionId: prediction.id, allocationLockId: result.allocationLock?.id ?? null, workstationStatus: result.workstation.status, flaggedJobIds: result.flaggedJobs.map((job) => job.externalId) };
    await db.update(agentRuns).set({ status: "completed", correlationId: input.correlationId, output, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, allocationLock: result.allocationLock, flaggedJobIds: output.flaggedJobIds };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Recovery orchestration unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}

/** The only supported server-side production-job assignment boundary. */
export async function assignProductionJob(input: { externalId: string; workstationId: string; state: "queued" | "in_flight" }) {
  return db.transaction(async (tx) => {
    const [lock] = await tx.select().from(workstationAllocationLocks)
      .where(and(eq(workstationAllocationLocks.workstationId, input.workstationId), eq(workstationAllocationLocks.state, "active")))
      .limit(1);
    if (lock) throw new WorkstationAllocationLockedError(`Workstation ${input.workstationId} is allocation-locked by recovery correlation ${lock.correlationId}.`);
    const [job] = await tx.insert(productionJobs).values(input).returning();
    return job;
  });
}
