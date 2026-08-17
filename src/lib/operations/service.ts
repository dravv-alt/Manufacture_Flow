import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { failureCases, inventoryItems, inventoryReservations, maintenanceWorkOrders, notifications, parts, procurementRequests, reroutePlans, shipmentImpacts, workstations, workflowEvents } from "@/lib/db/schema";

export type WorkflowAction =
  | { type: "reserve_part"; actor: string; quantity: number }
  | { type: "approve_reroute"; actor: string }
  | { type: "advance_maintenance"; actor: string; expectedStage: number }
  | { type: "acknowledge_notification"; actor: string; notificationId: string };

export class OperationNotFoundError extends Error {}
export class OperationConflictError extends Error {}

async function getFailureCase(externalId: string) {
  const [failureCase] = await db.select().from(failureCases).where(eq(failureCases.externalId, externalId)).limit(1);
  if (!failureCase) throw new OperationNotFoundError(`Failure case ${externalId} was not found.`);
  return failureCase;
}

async function recordEvent(input: { failureCaseId: string; entityType: string; entityId: string; eventType: string; actor: string; payload: Record<string, unknown> }) {
  await db.insert(workflowEvents).values(input);
}

export async function getOverview() {
  const [stationRows, caseRows, inventoryRows, rerouteRows, workOrderRows, shipmentRows] = await Promise.all([
    db.select({ code: workstations.code, name: workstations.name, line: workstations.line, status: workstations.status, capacityPercent: workstations.capacityPercent }).from(workstations).orderBy(workstations.code),
    db.select({ id: failureCases.externalId, stationId: workstations.code, severity: failureCases.severity, component: failureCases.component, probability: failureCases.probability, ttfHours: failureCases.ttfHours, state: failureCases.workflowState }).from(failureCases).innerJoin(workstations, eq(failureCases.workstationId, workstations.id)).orderBy(desc(failureCases.detectedAt)),
    db.select({ partId: parts.code, location: inventoryItems.location, onHand: inventoryItems.onHand, reserved: inventoryItems.reserved, state: inventoryItems.state }).from(inventoryItems).innerJoin(parts, eq(inventoryItems.partId, parts.id)),
    db.select({ state: reroutePlans.state }).from(reroutePlans),
    db.select({ externalId: maintenanceWorkOrders.externalId, stage: maintenanceWorkOrders.stage, assignee: maintenanceWorkOrders.assignee, scenario: maintenanceWorkOrders.scenario }).from(maintenanceWorkOrders),
    db.select({ externalId: shipmentImpacts.externalId, deltaHours: shipmentImpacts.deltaHours, state: shipmentImpacts.state, revisedEta: shipmentImpacts.revisedEta }).from(shipmentImpacts),
  ]);

  return {
    source: "postgres" as const,
    generatedAt: new Date().toISOString(),
    workstations: stationRows,
    failureCases: caseRows,
    inventory: inventoryRows,
    reroutePlans: rerouteRows,
    maintenance: workOrderRows,
    shipmentImpacts: shipmentRows,
  };
}

export async function getCaseDetail(externalId: string) {
  const failureCase = await getFailureCase(externalId);
  const [stationRows, partRows, inventoryRows, reservationRows, rerouteRows, procurementRows, workOrderRows, shipmentRows, notificationRows, eventRows] = await Promise.all([
    db.select({ code: workstations.code, name: workstations.name, status: workstations.status, capacityPercent: workstations.capacityPercent }).from(workstations).where(eq(workstations.id, failureCase.workstationId)),
    db.select({ code: parts.code, name: parts.name }).from(parts).where(eq(parts.id, failureCase.partId)),
    db.select({ id: inventoryItems.id, location: inventoryItems.location, onHand: inventoryItems.onHand, reserved: inventoryItems.reserved, state: inventoryItems.state }).from(inventoryItems).where(eq(inventoryItems.partId, failureCase.partId)),
    db.select().from(inventoryReservations).where(eq(inventoryReservations.failureCaseId, failureCase.id)),
    db.select().from(reroutePlans).where(eq(reroutePlans.failureCaseId, failureCase.id)),
    db.select().from(procurementRequests).where(eq(procurementRequests.failureCaseId, failureCase.id)),
    db.select().from(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.failureCaseId, failureCase.id)),
    db.select().from(shipmentImpacts).where(eq(shipmentImpacts.failureCaseId, failureCase.id)),
    db.select().from(notifications).where(eq(notifications.failureCaseId, failureCase.id)),
    db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id)).orderBy(desc(workflowEvents.occurredAt)),
  ]);

  return { failureCase, workstation: stationRows[0] ?? null, part: partRows[0] ?? null, inventory: inventoryRows, reservations: reservationRows, reroutePlans: rerouteRows, procurementRequests: procurementRows, maintenanceWorkOrders: workOrderRows, shipmentImpacts: shipmentRows, notifications: notificationRows, events: eventRows };
}

export async function applyWorkflowAction(externalId: string, action: WorkflowAction) {
  return db.transaction(async (tx) => {
    const [failureCase] = await tx.select().from(failureCases).where(eq(failureCases.externalId, externalId)).limit(1);
    if (!failureCase) throw new OperationNotFoundError(`Failure case ${externalId} was not found.`);

    if (action.type === "reserve_part") {
      const [inventory] = await tx.select().from(inventoryItems).where(eq(inventoryItems.partId, failureCase.partId)).limit(1);
      if (!inventory) throw new OperationNotFoundError("No inventory record exists for this failure case part.");
      const updated = await tx.update(inventoryItems)
        .set({ reserved: sql`${inventoryItems.reserved} + ${action.quantity}`, state: "reserved", version: sql`${inventoryItems.version} + 1`, updatedAt: new Date() })
        .where(and(eq(inventoryItems.id, inventory.id), sql`${inventoryItems.onHand} - ${inventoryItems.reserved} >= ${action.quantity}`))
        .returning();
      if (!updated[0]) throw new OperationConflictError("The requested part quantity is no longer available.");
      const [reservation] = await tx.insert(inventoryReservations).values({ inventoryItemId: inventory.id, failureCaseId: failureCase.id, quantity: action.quantity, actor: action.actor }).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "inventory_reservation", entityId: reservation.id, eventType: "part_reserved", actor: action.actor, payload: { quantity: action.quantity, inventoryItemId: inventory.id } });
      return { action: action.type, reservation, inventory: updated[0] };
    }

    if (action.type === "approve_reroute") {
      const [plan] = await tx.select().from(reroutePlans).where(eq(reroutePlans.failureCaseId, failureCase.id)).limit(1);
      if (!plan) throw new OperationNotFoundError("No reroute plan exists for this failure case.");
      if (plan.state !== "draft") throw new OperationConflictError(`Reroute plan is already ${plan.state}.`);
      const [updated] = await tx.update(reroutePlans).set({ state: "approved", approvedBy: action.actor, approvedAt: new Date(), updatedAt: new Date() }).where(eq(reroutePlans.id, plan.id)).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "reroute_plan", entityId: plan.id, eventType: "reroute_approved", actor: action.actor, payload: { affectedJobs: plan.affectedJobs, targetWorkstationId: plan.targetWorkstationId } });
      return { action: action.type, reroutePlan: updated };
    }

    if (action.type === "advance_maintenance") {
      const [workOrder] = await tx.select().from(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.failureCaseId, failureCase.id)).limit(1);
      if (!workOrder) throw new OperationNotFoundError("No maintenance work order exists for this failure case.");
      if (workOrder.stage !== action.expectedStage) throw new OperationConflictError(`Maintenance stage changed from ${action.expectedStage} to ${workOrder.stage}; refresh before trying again.`);
      if (workOrder.stage >= 7) throw new OperationConflictError("Maintenance work order is already returned to service.");
      const [updated] = await tx.update(maintenanceWorkOrders).set({ stage: workOrder.stage + 1, updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "maintenance_stage_advanced", actor: action.actor, payload: { fromStage: workOrder.stage, toStage: updated.stage } });
      return { action: action.type, workOrder: updated };
    }

    const [notification] = await tx.select().from(notifications).where(and(eq(notifications.id, action.notificationId), eq(notifications.failureCaseId, failureCase.id))).limit(1);
    if (!notification) throw new OperationNotFoundError("Notification does not belong to this failure case.");
    if (notification.state === "acknowledged") throw new OperationConflictError("Notification is already acknowledged.");
    const [updated] = await tx.update(notifications).set({ state: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: action.actor, updatedAt: new Date() }).where(eq(notifications.id, notification.id)).returning();
    await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "notification", entityId: notification.id, eventType: "notification_acknowledged", actor: action.actor, payload: { recipientRole: notification.recipientRole, channel: notification.channel } });
    return { action: action.type, notification: updated };
  });
}
