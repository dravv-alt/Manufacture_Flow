import { and, desc, eq } from "drizzle-orm";
import { RECOVERY_TIME_CALCULATION_VERSION, calculateRecoveryTime, type RecoveryTimePlanningInputs } from "@/lib/agents/recovery-time-estimation";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, maintenanceWorkOrders, procurementAutomationResults, procurementRequests, recoveryTimeEstimates, resourceRecoveryResults, workflowEvents } from "@/lib/db/schema";

export class RecoveryTimeEstimationNotFoundError extends Error {}

type RankedVendorOption = { vendorId: string; vendorName: string; leadTimeHours: number; unitCostCents: number; reliabilityScore: number };

export async function runRecoveryTimeEstimation(input: { maintenanceWorkOrderId: string; correlationId: string; failureCaseExternalId: string }) {
  const [workOrder] = await db.select({
    id: maintenanceWorkOrders.id,
    externalId: maintenanceWorkOrders.externalId,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
    scenario: maintenanceWorkOrders.scenario,
    plannedWindowStart: maintenanceWorkOrders.plannedWindowStart,
    plannedWindowEnd: maintenanceWorkOrders.plannedWindowEnd,
    resourceRecoveryResultId: maintenanceWorkOrders.resourceRecoveryResultId,
    procurementAutomationResultId: maintenanceWorkOrders.procurementAutomationResultId,
    recoveryCorrelationId: resourceRecoveryResults.correlationId,
    recoveryOutcome: resourceRecoveryResults.outcome,
    recoveryCreatedAt: resourceRecoveryResults.createdAt,
    procurementOutcome: procurementAutomationResults.outcome,
    selectedVendorId: procurementAutomationResults.selectedVendorId,
    rankedOptions: procurementAutomationResults.rankedOptions,
    procurementRequestId: procurementRequests.id,
    procurementRequestedAt: procurementRequests.createdAt,
  }).from(maintenanceWorkOrders)
    .innerJoin(failureCases, eq(maintenanceWorkOrders.failureCaseId, failureCases.id))
    .innerJoin(resourceRecoveryResults, eq(maintenanceWorkOrders.resourceRecoveryResultId, resourceRecoveryResults.id))
    .leftJoin(procurementAutomationResults, eq(maintenanceWorkOrders.procurementAutomationResultId, procurementAutomationResults.id))
    .leftJoin(procurementRequests, eq(procurementAutomationResults.procurementRequestId, procurementRequests.id))
    .where(eq(maintenanceWorkOrders.id, input.maintenanceWorkOrderId))
    .limit(1);

  if (!workOrder) throw new RecoveryTimeEstimationNotFoundError(`Maintenance work order ${input.maintenanceWorkOrderId} was not found.`);
  if (workOrder.failureCaseExternalId !== input.failureCaseExternalId || workOrder.recoveryCorrelationId !== input.correlationId || !workOrder.plannedWindowStart || !workOrder.plannedWindowEnd) {
    throw new RecoveryTimeEstimationNotFoundError("Recovery graph state does not match persisted recovery-time planning context.");
  }

  const repairDurationMinutes = Math.round((workOrder.plannedWindowEnd.getTime() - workOrder.plannedWindowStart.getTime()) / 60_000);
  const planningInputs: RecoveryTimePlanningInputs = {
    calculationVersion: RECOVERY_TIME_CALCULATION_VERSION,
    scenario: workOrder.scenario === "procurement" ? "procurement" : "local_spare",
    maintenanceWindowStart: workOrder.plannedWindowStart.toISOString(),
    maintenanceWindowEnd: workOrder.plannedWindowEnd.toISOString(),
    repairDurationMinutes,
    validationMinutes: 60,
    recoveryRecordedAt: workOrder.recoveryCreatedAt.toISOString(),
  };

  if (planningInputs.scenario === "local_spare") {
    if (workOrder.recoveryOutcome !== "reserved") throw new RecoveryTimeEstimationNotFoundError("Local-spare work order has no persisted inventory reservation outcome.");
  } else {
    const rankedOptions = Array.isArray(workOrder.rankedOptions) ? workOrder.rankedOptions as RankedVendorOption[] : [];
    const selected = rankedOptions.find((option) => option.vendorId === workOrder.selectedVendorId);
    if (workOrder.procurementOutcome !== "requisition_created" || !workOrder.procurementRequestedAt || !selected) {
      throw new RecoveryTimeEstimationNotFoundError("Procurement-backed work order has no persisted vendor planning inputs.");
    }
    planningInputs.procurement = {
      requestedAt: workOrder.procurementRequestedAt.toISOString(),
      vendorLeadTimeHours: selected.leadTimeHours,
      receiptAndInspectionMinutes: 60,
    };
  }

  const calculation = calculateRecoveryTime(planningInputs);
  const sourceEventId = `recovery-time:${workOrder.id}:${calculation.inputHash}`;
  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "RecoveryTimeEstimationAgent",
    status: "running",
    correlationId: input.correlationId,
    sourceEventId,
    input: { maintenanceWorkOrderId: workOrder.id, failureCaseId: workOrder.failureCaseExternalId, ...planningInputs },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [estimate] = await db.select().from(recoveryTimeEstimates).where(and(eq(recoveryTimeEstimates.maintenanceWorkOrderId, workOrder.id), eq(recoveryTimeEstimates.inputHash, calculation.inputHash))).limit(1);
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "RecoveryTimeEstimationAgent"), eq(agentRuns.sourceEventId, sourceEventId))).limit(1);
    if (!estimate) throw new RecoveryTimeEstimationNotFoundError(`Recovery-time estimation for work order ${workOrder.externalId} is incomplete and requires operational review.`);
    return { idempotent: true, agentRun: agentRun ?? null, estimate };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(recoveryTimeEstimates).where(and(eq(recoveryTimeEstimates.maintenanceWorkOrderId, workOrder.id), eq(recoveryTimeEstimates.inputHash, calculation.inputHash))).limit(1);
      if (existing) return { estimate: existing, created: false };
      const [latest] = await tx.select({ revision: recoveryTimeEstimates.revision }).from(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.maintenanceWorkOrderId, workOrder.id)).orderBy(desc(recoveryTimeEstimates.revision)).limit(1);
      const [estimate] = await tx.insert(recoveryTimeEstimates).values({
        failureCaseId: workOrder.failureCaseId,
        maintenanceWorkOrderId: workOrder.id,
        correlationId: input.correlationId,
        revision: (latest?.revision ?? 0) + 1,
        scenario: planningInputs.scenario,
        calculationVersion: RECOVERY_TIME_CALCULATION_VERSION,
        inputHash: calculation.inputHash,
        calculationInputs: planningInputs,
        expectedRecoveryAt: calculation.expectedRecoveryAt,
        durationMinutes: calculation.durationMinutes,
      }).returning();
      await tx.insert(workflowEvents).values({
        failureCaseId: workOrder.failureCaseId,
        entityType: "recovery_time_estimate",
        entityId: estimate.id,
        eventType: "recovery_time_estimated",
        actor: "Recovery Time Estimation Agent",
        payload: { correlationId: input.correlationId, maintenanceWorkOrderId: workOrder.id, revision: estimate.revision, scenario: planningInputs.scenario, calculationVersion: RECOVERY_TIME_CALCULATION_VERSION, expectedRecoveryAt: estimate.expectedRecoveryAt.toISOString(), durationMinutes: estimate.durationMinutes, calculationInputs: planningInputs },
      });
      return { estimate, created: true };
    });
    await db.update(agentRuns).set({ status: "completed", output: { recoveryTimeEstimateId: result.estimate.id, revision: result.estimate.revision, expectedRecoveryAt: result.estimate.expectedRecoveryAt.toISOString(), durationMinutes: result.estimate.durationMinutes, idempotentEstimate: !result.created }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: !result.created, agentRun: { id: createdRun.id, status: "completed" as const }, estimate: result.estimate };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Recovery-time estimation unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
