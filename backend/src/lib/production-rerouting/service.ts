import { and, eq, inArray } from "drizzle-orm";
import { rankRerouteCandidates } from "@/lib/agents/production-rerouting";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, productionJobs, recoveryTimeEstimates, rerouteDecisions, reroutePlans, workstationAllocationLocks, workstationCapabilities, workstations, workflowEvents } from "@/lib/db/schema";

export class ProductionReroutingNotFoundError extends Error {}

export async function runProductionRerouting(input: { recoveryTimeEstimateId: string; correlationId: string; failureCaseExternalId: string }) {
  const [context] = await db.select({ estimateId: recoveryTimeEstimates.id, expectedRecoveryAt: recoveryTimeEstimates.expectedRecoveryAt, correlationId: recoveryTimeEstimates.correlationId, failureCaseId: failureCases.id, failureCaseExternalId: failureCases.externalId, sourceWorkstationId: failureCases.workstationId }).from(recoveryTimeEstimates).innerJoin(failureCases, eq(recoveryTimeEstimates.failureCaseId, failureCases.id)).where(eq(recoveryTimeEstimates.id, input.recoveryTimeEstimateId)).limit(1);
  if (!context || context.correlationId !== input.correlationId || context.failureCaseExternalId !== input.failureCaseExternalId) throw new ProductionReroutingNotFoundError("Recovery-time estimate does not match the persisted rerouting context.");
  const [createdRun] = await db.insert(agentRuns).values({ agentName: "ProductionReroutingAgent", status: "running", workstationId: context.sourceWorkstationId, correlationId: input.correlationId, sourceEventId: context.estimateId, input: { recoveryTimeEstimateId: context.estimateId, failureCaseId: context.failureCaseExternalId, correlationId: input.correlationId } }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();
  if (!createdRun) {
    const decisions = await db.select().from(rerouteDecisions).where(eq(rerouteDecisions.correlationId, input.correlationId));
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "ProductionReroutingAgent"), eq(agentRuns.sourceEventId, context.estimateId))).limit(1);
    return { idempotent: true, agentRun: agentRun ?? null, decisions };
  }
  try {
    const result = await db.transaction(async (tx) => {
      const jobs = await tx.select().from(productionJobs).where(and(eq(productionJobs.workstationId, context.sourceWorkstationId), eq(productionJobs.rerouteEvaluationRequired, true), inArray(productionJobs.state, ["queued", "in_flight"])));
      const stations = await tx.select().from(workstations).where(eq(workstations.plantId, (await tx.select({ plantId: workstations.plantId }).from(workstations).where(eq(workstations.id, context.sourceWorkstationId)).limit(1))[0]!.plantId));
      const capabilities = await tx.select().from(workstationCapabilities).where(inArray(workstationCapabilities.workstationId, stations.map((station) => station.id)));
      const locks = await tx.select().from(workstationAllocationLocks).where(and(inArray(workstationAllocationLocks.workstationId, stations.map((station) => station.id)), eq(workstationAllocationLocks.state, "active")));
      const loads = new Map(stations.map((station) => [station.id, station.capacityPercent]));
      const decisions = [] as Array<{ id: string; outcome: string; productionJobId: string }>;
      for (const job of jobs) {
        const candidates = rankRerouteCandidates(job, context.sourceWorkstationId, stations.map((station) => ({ ...station, capacityPercent: loads.get(station.id) ?? station.capacityPercent, locked: locks.some((lock) => lock.workstationId === station.id), capabilities: capabilities.filter((capability) => capability.workstationId === station.id) })));
        const selected = candidates[0];
        const rationale = { operationCode: job.operationCode, toolingCode: job.toolingCode, requiredSkill: job.requiredSkill, estimatedLoadPercent: job.estimatedLoadPercent, projectedJobCompletionAt: context.expectedRecoveryAt.toISOString(), candidateCodes: candidates.map((candidate) => candidate.code) };
        if (!selected) {
          const [decision] = await tx.insert(rerouteDecisions).values({ failureCaseId: context.failureCaseId, productionJobId: job.id, sourceWorkstationId: context.sourceWorkstationId, correlationId: input.correlationId, outcome: "no_feasible_candidate", rationale }).returning();
          await tx.insert(workflowEvents).values({ failureCaseId: context.failureCaseId, entityType: "reroute_decision", entityId: decision.id, eventType: "reroute_requires_intervention", actor: "Production Rerouting Agent", payload: { correlationId: input.correlationId, productionJobId: job.id, ...rationale } });
          decisions.push(decision); continue;
        }
        const [decision] = await tx.insert(rerouteDecisions).values({ failureCaseId: context.failureCaseId, productionJobId: job.id, sourceWorkstationId: context.sourceWorkstationId, targetWorkstationId: selected.id, correlationId: input.correlationId, outcome: "rerouted", rationale: { ...rationale, selectedWorkstationCode: selected.code, projectedCapacityPercent: selected.capacityPercent + job.estimatedLoadPercent } }).returning();
        await tx.update(productionJobs).set({ workstationId: selected.id, rerouteEvaluationRequired: false, rerouteEvaluationReason: null, updatedAt: new Date() }).where(eq(productionJobs.id, job.id));
        await tx.update(workstations).set({ capacityPercent: selected.capacityPercent + job.estimatedLoadPercent, updatedAt: new Date() }).where(eq(workstations.id, selected.id));
        loads.set(selected.id, selected.capacityPercent + job.estimatedLoadPercent);
        await tx.insert(reroutePlans).values({ failureCaseId: context.failureCaseId, sourceWorkstationId: context.sourceWorkstationId, targetWorkstationId: selected.id, affectedJobs: [job.externalId], state: "executed", approvedBy: "Production Rerouting Agent", approvedAt: new Date() });
        await tx.insert(workflowEvents).values({ failureCaseId: context.failureCaseId, entityType: "reroute_decision", entityId: decision.id, eventType: "production_job_rerouted", actor: "Production Rerouting Agent", payload: { correlationId: input.correlationId, productionJobId: job.id, targetWorkstationCode: selected.code, ...rationale } });
        decisions.push(decision);
      }
      const unresolved = decisions.some((decision) => decision.outcome === "no_feasible_candidate");
      await tx.update(failureCases).set({ workflowState: unresolved ? "Reroute intervention required" : "Production jobs rerouted / recovery execution pending", updatedAt: new Date() }).where(eq(failureCases.id, context.failureCaseId));
      return { decisions, unresolved };
    });
    await db.update(agentRuns).set({ status: "completed", output: { rerouteDecisionIds: result.decisions.map((decision) => decision.id), outcome: result.unresolved ? "requires_intervention" : "rerouted" }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, decisions: result.decisions };
  } catch (error) { await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Production rerouting unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id)); throw error; }
}
