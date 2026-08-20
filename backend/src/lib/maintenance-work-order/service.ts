import { and, eq } from "drizzle-orm";
import { createMaintenancePlan } from "@/lib/agents/maintenance-work-order";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, maintenanceWorkOrders, parts, procurementAutomationResults, resourceRecoveryResults, workflowEvents, workstations } from "@/lib/db/schema";

export class MaintenanceWorkOrderNotFoundError extends Error {}

export async function runMaintenanceWorkOrderCreation(input: { resourceRecoveryResultId: string; correlationId: string; failureCaseExternalId: string; component: string; requiredPartCode: string; inventoryReservationId: string | null; procurementAutomationResultId: string | null }) {
  const [recovery] = await db.select({
    id: resourceRecoveryResults.id,
    correlationId: resourceRecoveryResults.correlationId,
    outcome: resourceRecoveryResults.outcome,
    inventoryReservationId: resourceRecoveryResults.inventoryReservationId,
    createdAt: resourceRecoveryResults.createdAt,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
    component: failureCases.component,
    partId: parts.id,
    partCode: parts.code,
    workstationId: workstations.id,
    workstationCode: workstations.code,
  }).from(resourceRecoveryResults)
    .innerJoin(failureCases, eq(resourceRecoveryResults.failureCaseId, failureCases.id))
    .innerJoin(parts, eq(failureCases.partId, parts.id))
    .innerJoin(workstations, eq(failureCases.workstationId, workstations.id))
    .where(eq(resourceRecoveryResults.id, input.resourceRecoveryResultId))
    .limit(1);
  if (!recovery) throw new MaintenanceWorkOrderNotFoundError(`Resource recovery result ${input.resourceRecoveryResultId} was not found.`);
  if (recovery.correlationId !== input.correlationId || recovery.failureCaseExternalId !== input.failureCaseExternalId || recovery.component !== input.component || recovery.partCode !== input.requiredPartCode) {
    throw new MaintenanceWorkOrderNotFoundError("Recovery graph state does not match the persisted maintenance context.");
  }

  const source = recovery.outcome === "reserved" && recovery.inventoryReservationId === input.inventoryReservationId
    ? { kind: "local_spare" as const, procurementAutomationResultId: null, anchorTime: recovery.createdAt }
    : await procurementSource();

  async function procurementSource() {
    if (!input.procurementAutomationResultId) throw new MaintenanceWorkOrderNotFoundError("A procurement-required recovery has no persisted requisition result.");
    const [procurement] = await db.select().from(procurementAutomationResults).where(and(eq(procurementAutomationResults.id, input.procurementAutomationResultId), eq(procurementAutomationResults.resourceRecoveryResultId, recovery.id))).limit(1);
    if (!procurement || procurement.correlationId !== input.correlationId || procurement.outcome !== "requisition_created" || !procurement.procurementRequestId) {
      throw new MaintenanceWorkOrderNotFoundError("No successful procurement result exists for this recovery correlation.");
    }
    return { kind: "procurement" as const, procurementAutomationResultId: procurement.id, anchorTime: procurement.createdAt };
  }

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "MaintenanceWorkOrderAgent",
    status: "running",
    workstationId: recovery.workstationId,
    correlationId: input.correlationId,
    sourceEventId: recovery.id,
    input: { resourceRecoveryResultId: recovery.id, failureCaseId: recovery.failureCaseExternalId, component: recovery.component, partCode: recovery.partCode, source: source.kind, correlationId: input.correlationId },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [workOrder] = await db.select().from(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.resourceRecoveryResultId, recovery.id)).limit(1);
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "MaintenanceWorkOrderAgent"), eq(agentRuns.sourceEventId, recovery.id))).limit(1);
    if (!workOrder) throw new MaintenanceWorkOrderNotFoundError(`Maintenance work-order creation for recovery result ${recovery.id} is incomplete and requires operational review.`);
    return { idempotent: true, agentRun: agentRun ?? null, workOrder };
  }

  try {
    const plan = createMaintenancePlan({ component: recovery.component, partCode: recovery.partCode, source: source.kind, anchorTime: source.anchorTime });
    const [workOrder] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(maintenanceWorkOrders).values({
        externalId: `WO-AUTO-${recovery.id.slice(0, 12).toUpperCase()}`,
        failureCaseId: recovery.failureCaseId,
        workstationId: recovery.workstationId,
        partId: recovery.partId,
        assignee: "Unassigned / Maintenance Lead",
        priority: plan.priority,
        diagnosis: plan.diagnosis,
        resourceRecoveryResultId: recovery.id,
        procurementAutomationResultId: source.procurementAutomationResultId,
        plannedWindowStart: plan.plannedWindowStart,
        plannedWindowEnd: plan.plannedWindowEnd,
        checklist: plan.checklist,
        stage: 1,
        scenario: source.kind,
      }).returning();
      await tx.update(failureCases).set({ workflowState: "Critical maintenance work order planned", updatedAt: new Date() }).where(eq(failureCases.id, recovery.failureCaseId));
      await tx.insert(workflowEvents).values({
        failureCaseId: recovery.failureCaseId,
        entityType: "maintenance_work_order",
        entityId: created.id,
        eventType: "critical_maintenance_work_order_created",
        actor: "Maintenance Work Order Agent",
        payload: { correlationId: input.correlationId, resourceRecoveryResultId: recovery.id, procurementAutomationResultId: source.procurementAutomationResultId, workstationCode: recovery.workstationCode, component: recovery.component, partCode: recovery.partCode, priority: plan.priority, plannedWindowStart: plan.plannedWindowStart.toISOString(), plannedWindowEnd: plan.plannedWindowEnd.toISOString(), checklist: plan.checklist, planningWindowOnly: true },
      });
      return [created];
    });
    await db.update(agentRuns).set({ status: "completed", output: { maintenanceWorkOrderId: workOrder.id, externalId: workOrder.externalId, priority: workOrder.priority, plannedWindowStart: workOrder.plannedWindowStart?.toISOString(), plannedWindowEnd: workOrder.plannedWindowEnd?.toISOString(), source: source.kind }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, workOrder };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Maintenance work-order creation unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
