import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { failureCases, maintenanceWorkOrders, recoveryGraphRuns, workstationAllocationLocks, workstations, workflowEvents } from "@/lib/db/schema";
import { MAINTENANCE_STAGE, MaintenanceStagePolicyError, nextMaintenanceStage } from "./policy";

export type MaintenanceExecutionAction =
  | { type: "start_maintenance"; actor: string; workOrderId: string; expectedStage: number; notes?: string }
  | { type: "record_repair_completion"; actor: string; workOrderId: string; expectedStage: number; notes: string }
  | { type: "start_machine_testing"; actor: string; workOrderId: string; expectedStage: number; notes?: string }
  | { type: "record_return_to_service_validation"; actor: string; workOrderId: string; expectedStage: number; passed: boolean; notes: string };

export class MaintenanceExecutionNotFoundError extends Error {}
export class MaintenanceExecutionConflictError extends Error {}

export function isMaintenanceExecutionAction(action: { type: string }): action is MaintenanceExecutionAction {
  return ["start_maintenance", "record_repair_completion", "start_machine_testing", "record_return_to_service_validation"].includes(action.type);
}

function eventExists(events: Array<typeof workflowEvents.$inferSelect>, type: string) {
  return events.some((event) => event.eventType === type);
}

export async function applyMaintenanceExecutionAction(failureCaseExternalId: string, action: MaintenanceExecutionAction) {
  return db.transaction(async (tx) => {
    const [failureCase] = await tx.select().from(failureCases).where(eq(failureCases.externalId, failureCaseExternalId)).limit(1);
    if (!failureCase) throw new MaintenanceExecutionNotFoundError(`Failure case ${failureCaseExternalId} was not found.`);
    const [workOrder] = await tx.select().from(maintenanceWorkOrders).where(and(eq(maintenanceWorkOrders.id, action.workOrderId), eq(maintenanceWorkOrders.failureCaseId, failureCase.id))).limit(1);
    if (!workOrder) throw new MaintenanceExecutionNotFoundError("The maintenance work order does not belong to this failure case.");
    if (workOrder.workstationId !== failureCase.workstationId) throw new MaintenanceExecutionConflictError("Maintenance work-order workstation linkage does not match the failure incident.");
    const events = await tx.select().from(workflowEvents).where(and(eq(workflowEvents.failureCaseId, failureCase.id), eq(workflowEvents.entityId, workOrder.id))).orderBy(workflowEvents.occurredAt);
    const [allocationLock] = await tx.select().from(workstationAllocationLocks).where(eq(workstationAllocationLocks.workstationId, workOrder.workstationId)).limit(1);
    const [workstation] = await tx.select().from(workstations).where(eq(workstations.id, workOrder.workstationId)).limit(1);
    if (!workstation) throw new MaintenanceExecutionNotFoundError("The maintenance workstation was not found.");

    if (action.type === "record_return_to_service_validation" && action.passed && workOrder.stage === MAINTENANCE_STAGE.RETURNED_TO_SERVICE && eventExists(events, "return_to_service_validation_passed")) {
      return { action: action.type, idempotent: true, workOrder, allocationLock: allocationLock ?? null, workstation, failureCase, recoveryState: "RECOVERED" as const };
    }
    if (!allocationLock || allocationLock.state !== "active") throw new MaintenanceExecutionConflictError("An active allocation lock for this workstation and recovery incident is required.");
    if (allocationLock.failureCaseId !== failureCase.id) throw new MaintenanceExecutionConflictError("The active allocation lock belongs to another recovery incident.");
    const [graphRun] = await tx.select().from(recoveryGraphRuns).where(eq(recoveryGraphRuns.correlationId, allocationLock.correlationId)).limit(1);
    if (!graphRun) throw new MaintenanceExecutionConflictError("The allocation lock has no persisted recovery graph correlation.");
    const graphState = graphRun.state as Record<string, unknown>;
    if (graphState.maintenanceWorkOrderId !== workOrder.id || graphState.failureCaseExternalId !== failureCase.externalId) throw new MaintenanceExecutionConflictError("The work order, allocation lock, and recovery graph do not describe the same incident.");
    if (workOrder.stage !== action.expectedStage) throw new MaintenanceExecutionConflictError(`Maintenance stage changed from ${action.expectedStage} to ${workOrder.stage}; refresh before retrying.`);

    const maintenanceExecution = typeof graphState.maintenanceExecution === "object" && graphState.maintenanceExecution !== null ? graphState.maintenanceExecution as Record<string, unknown> : {};
    if (action.type === "record_return_to_service_validation" && !action.passed && maintenanceExecution.validation === "FAILED") {
      return { action: action.type, idempotent: true, workOrder, allocationLock, workstation, failureCase, recoveryState: "REQUIRES_INTERVENTION" as const };
    }
    const reworkRequired = maintenanceExecution.validation === "FAILED";
    let nextStage: number;
    try {
      nextStage = nextMaintenanceStage({ stage: workOrder.stage, command: action.type, validationPassed: action.type === "record_return_to_service_validation" ? action.passed : undefined, reworkRequired });
    } catch (error) {
      if (error instanceof MaintenanceStagePolicyError) throw new MaintenanceExecutionConflictError(error.message);
      throw error;
    }

    const duplicateEvent = action.type === "start_maintenance" ? "maintenance_started" : action.type === "record_repair_completion" ? "repair_completed" : action.type === "start_machine_testing" ? "machine_testing_started" : action.passed ? "return_to_service_validation_passed" : "return_to_service_validation_failed";
    if (action.type !== "record_return_to_service_validation" && eventExists(events, duplicateEvent) && nextStage === workOrder.stage) return { action: action.type, idempotent: true, workOrder, allocationLock, workstation, failureCase, recoveryState: graphState.workflowStatus ?? "AWAITING_MAINTENANCE_EXECUTION" };

    const correlationPayload = { correlationId: allocationLock.correlationId, maintenanceWorkOrderId: workOrder.id, allocationLockId: allocationLock.id, notes: action.notes ?? null };
    if (action.type === "start_maintenance") {
      const nextGraphState = { ...graphState, workflowStatus: "AWAITING_MAINTENANCE_EXECUTION", maintenanceExecution: { workOrderId: workOrder.id, phase: "MAINTENANCE_STARTED", recordedBy: action.actor, recordedAt: new Date().toISOString() } };
      const [updatedWorkOrder] = await tx.update(maintenanceWorkOrders).set({ stage: nextStage, updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
      const [updatedWorkstation] = await tx.update(workstations).set({ status: "MAINTENANCE_IN_PROGRESS", updatedAt: new Date() }).where(eq(workstations.id, workstation.id)).returning();
      const [updatedFailureCase] = await tx.update(failureCases).set({ workflowState: "Maintenance execution in progress", updatedAt: new Date() }).where(eq(failureCases.id, failureCase.id)).returning();
      await tx.update(recoveryGraphRuns).set({ state: nextGraphState }).where(eq(recoveryGraphRuns.id, graphRun.id));
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "maintenance_started", actor: action.actor, payload: correlationPayload });
      return { action: action.type, idempotent: false, workOrder: updatedWorkOrder, allocationLock, workstation: updatedWorkstation, failureCase: updatedFailureCase, recoveryState: "AWAITING_MAINTENANCE_EXECUTION" as const };
    }

    if (action.type === "record_repair_completion") {
      const nextGraphState = { ...graphState, workflowStatus: "AWAITING_MAINTENANCE_EXECUTION", maintenanceExecution: { workOrderId: workOrder.id, phase: "REPAIR_COMPLETED", rework: reworkRequired, recordedBy: action.actor, recordedAt: new Date().toISOString() } };
      const [updatedWorkOrder] = await tx.update(maintenanceWorkOrders).set({ stage: nextStage, updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
      const [updatedFailureCase] = await tx.update(failureCases).set({ workflowState: "Repair completed / machine testing required", updatedAt: new Date() }).where(eq(failureCases.id, failureCase.id)).returning();
      await tx.update(recoveryGraphRuns).set({ state: nextGraphState }).where(eq(recoveryGraphRuns.id, graphRun.id));
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "repair_completed", actor: action.actor, payload: { ...correlationPayload, rework: reworkRequired } });
      return { action: action.type, idempotent: false, workOrder: updatedWorkOrder, allocationLock, workstation, failureCase: updatedFailureCase, recoveryState: "AWAITING_MAINTENANCE_EXECUTION" as const };
    }

    if (action.type === "start_machine_testing") {
      const nextGraphState = { ...graphState, workflowStatus: "RECOVERY_VALIDATION", maintenanceExecution: { workOrderId: workOrder.id, phase: "MACHINE_TESTING", recordedBy: action.actor, recordedAt: new Date().toISOString() } };
      const [updatedWorkOrder] = await tx.update(maintenanceWorkOrders).set({ stage: nextStage, updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
      const [updatedWorkstation] = await tx.update(workstations).set({ status: "MAINTENANCE_VALIDATION", updatedAt: new Date() }).where(eq(workstations.id, workstation.id)).returning();
      const [updatedFailureCase] = await tx.update(failureCases).set({ workflowState: "Machine testing in progress", updatedAt: new Date() }).where(eq(failureCases.id, failureCase.id)).returning();
      await tx.update(recoveryGraphRuns).set({ state: nextGraphState }).where(eq(recoveryGraphRuns.id, graphRun.id));
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "machine_testing_started", actor: action.actor, payload: correlationPayload });
      return { action: action.type, idempotent: false, workOrder: updatedWorkOrder, allocationLock, workstation: updatedWorkstation, failureCase: updatedFailureCase, recoveryState: "RECOVERY_VALIDATION" as const };
    }

    if (!action.passed) {
      const failureError = { node: "maintenance_execution", message: `Return-to-service validation failed: ${action.notes}`, occurredAt: new Date().toISOString() };
      const errors = Array.isArray(graphState.errors) ? graphState.errors : [];
      const nextGraphState = { ...graphState, workflowStatus: "REQUIRES_INTERVENTION", maintenanceExecution: { workOrderId: workOrder.id, validation: "FAILED", recordedBy: action.actor, recordedAt: new Date().toISOString() }, errors: [...errors, failureError] };
      const [updatedWorkstation] = await tx.update(workstations).set({ status: "MAINTENANCE_REWORK_REQUIRED", updatedAt: new Date() }).where(eq(workstations.id, workstation.id)).returning();
      const [updatedFailureCase] = await tx.update(failureCases).set({ workflowState: "Maintenance validation failed / intervention required", updatedAt: new Date() }).where(eq(failureCases.id, failureCase.id)).returning();
      await tx.update(recoveryGraphRuns).set({ state: nextGraphState }).where(eq(recoveryGraphRuns.id, graphRun.id));
      await tx.insert(workflowEvents).values([
        { failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "machine_testing_completed", actor: action.actor, payload: { ...correlationPayload, result: "FAILED" } },
        { failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "return_to_service_validation_failed", actor: action.actor, payload: correlationPayload },
      ]);
      return { action: action.type, idempotent: false, workOrder, allocationLock, workstation: updatedWorkstation, failureCase: updatedFailureCase, recoveryState: "REQUIRES_INTERVENTION" as const };
    }

    const completedAt = new Date();
    const nextGraphState = { ...graphState, workflowStatus: "RECOVERED", maintenanceExecution: { workOrderId: workOrder.id, validation: "PASSED", completedBy: action.actor, completedAt: completedAt.toISOString() } };
    const [updatedWorkOrder] = await tx.update(maintenanceWorkOrders).set({ stage: nextStage, updatedAt: completedAt }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
    const [releasedLock] = await tx.update(workstationAllocationLocks).set({ state: "released", releasedAt: completedAt, updatedAt: completedAt }).where(and(eq(workstationAllocationLocks.id, allocationLock.id), eq(workstationAllocationLocks.state, "active"), eq(workstationAllocationLocks.failureCaseId, failureCase.id), eq(workstationAllocationLocks.correlationId, graphRun.correlationId))).returning();
    if (!releasedLock) throw new MaintenanceExecutionConflictError("The allocation lock changed before return-to-service completion.");
    const [updatedWorkstation] = await tx.update(workstations).set({ status: "OPERATIONAL", updatedAt: completedAt }).where(eq(workstations.id, workstation.id)).returning();
    const [updatedFailureCase] = await tx.update(failureCases).set({ workflowState: "Recovered / returned to service", version: failureCase.version + 1, updatedAt: completedAt }).where(eq(failureCases.id, failureCase.id)).returning();
    await tx.update(recoveryGraphRuns).set({ state: nextGraphState }).where(eq(recoveryGraphRuns.id, graphRun.id));
    await tx.insert(workflowEvents).values([
      { failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "machine_testing_completed", actor: action.actor, payload: { ...correlationPayload, result: "PASSED" } },
      { failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "return_to_service_validation_passed", actor: action.actor, payload: correlationPayload },
      { failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "maintenance_work_order_completed", actor: action.actor, payload: correlationPayload },
      { failureCaseId: failureCase.id, entityType: "workstation_allocation_lock", entityId: allocationLock.id, eventType: "workstation_allocation_lock_released", actor: action.actor, payload: correlationPayload },
      { failureCaseId: failureCase.id, entityType: "workstation", entityId: workstation.id, eventType: "workstation_returned_to_service", actor: action.actor, payload: correlationPayload },
      { failureCaseId: failureCase.id, entityType: "recovery_graph_run", entityId: graphRun.id, eventType: "recovery_completed", actor: action.actor, payload: correlationPayload },
    ]);
    return { action: action.type, idempotent: false, workOrder: updatedWorkOrder, allocationLock: releasedLock, workstation: updatedWorkstation, failureCase: updatedFailureCase, recoveryState: "RECOVERED" as const };
  });
}
