import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, inventoryItems, inventoryReservations, machineMetricSnapshots, maintenanceWorkOrders, notificationAttempts, notifications, parts, procurementAutomationResults, procurementMessages, procurementRequests, productionJobs, recoveryGraphRuns, recoveryTimeEstimates, rerouteDecisions, reroutePlans, resourceRecoveryResults, shipmentCommitments, shipmentImpacts, telemetryReadings, vendorNotifications, vendors, workstationAllocationLocks, workstations, workflowEvents } from "@/lib/db/schema";
import { applyMaintenanceExecutionAction, isMaintenanceExecutionAction, MaintenanceExecutionConflictError, MaintenanceExecutionNotFoundError, type MaintenanceExecutionAction } from "@/lib/maintenance-execution/service";

export type WorkflowAction =
  | { type: "reserve_part"; actor: string; quantity: number }
  | { type: "approve_reroute"; actor: string }
  | { type: "advance_maintenance"; actor: string; expectedStage: number }
  | { type: "acknowledge_notification"; actor: string; notificationId: string }
  | { type: "retry_notification"; actor: string; notificationId: string }
  | { type: "set_procurement_state"; actor: string; state: "draft" | "sent" | "acknowledged" | "delayed" }
  | { type: "record_procurement_note"; actor: string; note: string }
  | { type: "set_shipment_state"; actor: string; state: "no-impact" | "revised" | "delayed" | "notification-pending" | "notified" | "failed" }
  | MaintenanceExecutionAction;

export class OperationNotFoundError extends Error {}
export class OperationConflictError extends Error {}

function compatibilityMetrics(telemetry: { observedAt: Date; motorCurrent: number; cycleCount: number; anomalySeverity: string } | undefined, capacityPercent: number) {
  if (!telemetry) return null;
  const availability = Math.max(70, Math.min(99, capacityPercent > 0 ? 100 - Math.max(0, 70 - capacityPercent) * 0.2 : 70));
  const performance = Math.max(65, Math.min(99, 100 - Math.max(0, telemetry.motorCurrent - 12) * 1.2));
  const quality = telemetry.anomalySeverity === "critical" ? 95 : telemetry.anomalySeverity === "warning" ? 98 : 99.5;
  const cycleTimeSeconds = Math.max(20, Math.round((3600 / Math.max(1, telemetry.cycleCount % 140)) * 10) / 10);
  return { powerKw: Math.round((Math.sqrt(3) * 400 * telemetry.motorCurrent * 0.82) / 100), availabilityPercent: availability, performancePercent: performance, qualityPercent: quality, oeePercent: Math.round((availability * performance * quality) / 10000 * 10) / 10, cycleTimeSeconds, outputPerHour: Math.max(1, Math.floor(3600 / cycleTimeSeconds)), defectRatePercent: Math.round((100 - quality) * 100) / 100, estimatedRulDays: telemetry.anomalySeverity === "critical" ? 2 : telemetry.anomalySeverity === "warning" ? 30 : 120, operatorId: "SIM", firmwareVersion: "sim-v1.0", networkPingMs: Math.max(8, Math.round(telemetry.motorCurrent)), lastMaintenanceAt: new Date(telemetry.observedAt.getTime() - 42 * 86_400_000), nextMaintenanceAt: new Date(telemetry.observedAt.getTime() + 30 * 86_400_000) };
}

async function getFailureCase(externalId: string) {
  const [failureCase] = await db.select().from(failureCases).where(eq(failureCases.externalId, externalId)).limit(1);
  if (!failureCase) throw new OperationNotFoundError(`Failure case ${externalId} was not found.`);
  return failureCase;
}

async function recordEvent(input: { failureCaseId: string; entityType: string; entityId: string; eventType: string; actor: string; payload: Record<string, unknown> }) {
  await db.insert(workflowEvents).values(input);
}

export async function getOverview() {
  const [stationRows, telemetryRows, metricRows, caseRows, inventoryRows, rerouteRows, workOrderRows, shipmentRows, jobRows, lockRows, notificationRows, graphRows] = await Promise.all([
    db.select({ code: workstations.code, name: workstations.name, line: workstations.line, status: workstations.status, capacityPercent: workstations.capacityPercent }).from(workstations).orderBy(workstations.code),
    db.select({ workstationId: telemetryReadings.workstationId, observedAt: telemetryReadings.observedAt, temperature: telemetryReadings.temperatureCelsius, vibration: telemetryReadings.vibrationMmPerSecond, pressure: telemetryReadings.pressureBar, cycleCount: telemetryReadings.cycleCount, motorCurrent: telemetryReadings.motorCurrentAmps, errorCount: sql<number>`jsonb_array_length(${telemetryReadings.activeErrorCodes})`, anomalySeverity: telemetryReadings.anomalySeverity }).from(telemetryReadings).orderBy(desc(telemetryReadings.observedAt)),
    db.select().from(machineMetricSnapshots).orderBy(desc(machineMetricSnapshots.observedAt)).catch(() => []),
    db.select({ id: failureCases.externalId, stationId: workstations.code, severity: failureCases.severity, component: failureCases.component, probability: failureCases.probability, ttfHours: failureCases.ttfHours, state: failureCases.workflowState }).from(failureCases).innerJoin(workstations, eq(failureCases.workstationId, workstations.id)).orderBy(desc(failureCases.detectedAt)),
    db.select({ partId: parts.code, location: inventoryItems.location, onHand: inventoryItems.onHand, reserved: inventoryItems.reserved, state: inventoryItems.state }).from(inventoryItems).innerJoin(parts, eq(inventoryItems.partId, parts.id)),
    db.select({ state: reroutePlans.state }).from(reroutePlans),
    db.select({ externalId: maintenanceWorkOrders.externalId, stage: maintenanceWorkOrders.stage, assignee: maintenanceWorkOrders.assignee, scenario: maintenanceWorkOrders.scenario }).from(maintenanceWorkOrders),
    db.select({ externalId: shipmentImpacts.externalId, deltaHours: shipmentImpacts.deltaHours, state: shipmentImpacts.state, revisedEta: shipmentImpacts.revisedEta }).from(shipmentImpacts),
    db.select({ id: productionJobs.id, externalId: productionJobs.externalId, workstationId: productionJobs.workstationId, state: productionJobs.state, operationCode: productionJobs.operationCode, toolingCode: productionJobs.toolingCode, requiredSkill: productionJobs.requiredSkill, estimatedLoadPercent: productionJobs.estimatedLoadPercent }).from(productionJobs),
    db.select({ failureCaseId: workstationAllocationLocks.failureCaseId, workstationId: workstationAllocationLocks.workstationId, state: workstationAllocationLocks.state, reason: workstationAllocationLocks.reason }).from(workstationAllocationLocks),
    db.select({ state: notifications.state }).from(notifications),
    db.select({ correlationId: recoveryGraphRuns.correlationId, status: recoveryGraphRuns.status, state: recoveryGraphRuns.state }).from(recoveryGraphRuns).orderBy(desc(recoveryGraphRuns.startedAt)).limit(1),
  ]);

  const latestTelemetry = new Map<string, typeof telemetryRows[number]>();
  for (const reading of telemetryRows) if (!latestTelemetry.has(reading.workstationId)) latestTelemetry.set(reading.workstationId, reading);
  const latestMetrics = new Map<string, typeof metricRows[number]>();
  for (const metric of metricRows) if (!latestMetrics.has(metric.workstationId)) latestMetrics.set(metric.workstationId, metric);
  const telemetryByCode = new Map((await db.select({ id: workstations.id, code: workstations.code }).from(workstations)).map((station) => [station.code, { telemetry: latestTelemetry.get(station.id) ?? null, metrics: latestMetrics.get(station.id) ?? null }]));
  return {
    source: "postgres" as const,
    generatedAt: new Date().toISOString(),
    workstations: stationRows.map((station) => { const feed = telemetryByCode.get(station.code) ?? { telemetry: null, metrics: null }; return { ...station, telemetry: feed.telemetry, metrics: feed.metrics ?? compatibilityMetrics(feed.telemetry, station.capacityPercent) }; }),
    failureCases: caseRows,
    inventory: inventoryRows,
    reroutePlans: rerouteRows,
    maintenance: workOrderRows,
    shipmentImpacts: shipmentRows,
    productionJobs: jobRows,
    allocationLocks: lockRows,
    notificationCounts: notificationRows.reduce((counts, item) => ({ ...counts, [item.state]: (counts[item.state] ?? 0) + 1 }), {} as Record<string, number>),
    recovery: graphRows[0] ?? null,
    activeFailureCaseId: caseRows[0]?.id ?? null,
  };
}

export async function getCaseDetail(externalId: string) {
  const failureCase = await getFailureCase(externalId);
  const [stationRows, partRows, inventoryRows, reservationRows, rerouteRows, procurementRows, workOrderRows, shipmentRows, notificationRows, eventRows, predictionRows, lockRows, recoveryRows, procurementResultRows, estimateRows, decisionRows, jobRows, graphRows] = await Promise.all([
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
    db.select().from(failurePredictions).where(eq(failurePredictions.failureCaseId, failureCase.id)).orderBy(desc(failurePredictions.createdAt)),
    db.select().from(workstationAllocationLocks).where(eq(workstationAllocationLocks.failureCaseId, failureCase.id)),
    db.select().from(resourceRecoveryResults).where(eq(resourceRecoveryResults.failureCaseId, failureCase.id)),
    db.select().from(procurementAutomationResults).where(eq(procurementAutomationResults.failureCaseId, failureCase.id)),
    db.select().from(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.failureCaseId, failureCase.id)).orderBy(desc(recoveryTimeEstimates.createdAt)),
    db.select().from(rerouteDecisions).where(eq(rerouteDecisions.failureCaseId, failureCase.id)),
    db.select().from(productionJobs),
    db.select().from(recoveryGraphRuns).orderBy(desc(recoveryGraphRuns.startedAt)),
  ]);

  const messages = procurementRows[0] ? await db.select().from(procurementMessages).where(eq(procurementMessages.procurementRequestId, procurementRows[0].id)).orderBy(procurementMessages.createdAt) : [];
  const attempts = notificationRows.length ? await db.select().from(notificationAttempts).where(inArray(notificationAttempts.notificationId, notificationRows.map((notice) => notice.id))).orderBy(desc(notificationAttempts.occurredAt)) : [];
  const vendorNoticeRows = procurementRows.length ? await db.select({ id: vendorNotifications.id, state: vendorNotifications.state, recipientEmail: vendorNotifications.recipientEmail, vendorName: vendors.name }).from(vendorNotifications).innerJoin(vendors, eq(vendorNotifications.vendorId, vendors.id)).where(inArray(vendorNotifications.procurementRequestId, procurementRows.map((item) => item.id))) : [];
  const commitmentIds = shipmentRows.map((item) => item.shipmentCommitmentId).filter((id): id is string => Boolean(id));
  const commitmentRows = commitmentIds.length ? await db.select().from(shipmentCommitments).where(inArray(shipmentCommitments.id, commitmentIds)) : [];
  const relevantJobIds = new Set([...decisionRows.map((item) => item.productionJobId), ...commitmentRows.flatMap((item) => item.productionJobIds)]);
  const correlationIds = new Set(lockRows.map((item) => item.correlationId));
  return { failureCase, workstation: stationRows[0] ?? null, part: partRows[0] ?? null, predictions: predictionRows, allocationLocks: lockRows, inventory: inventoryRows, reservations: reservationRows, resourceRecoveryResults: recoveryRows, reroutePlans: rerouteRows, rerouteDecisions: decisionRows, productionJobs: jobRows.filter((item) => relevantJobIds.has(item.id)), procurementRequests: procurementRows, procurementAutomationResults: procurementResultRows, procurementMessages: messages, vendorNotifications: vendorNoticeRows, maintenanceWorkOrders: workOrderRows, recoveryTimeEstimates: estimateRows, shipmentImpacts: shipmentRows, shipmentCommitments: commitmentRows, notifications: notificationRows, notificationAttempts: attempts, recoveryGraphRuns: graphRows.filter((item) => correlationIds.has(item.correlationId)), events: eventRows };
}

export async function applyWorkflowAction(externalId: string, action: WorkflowAction) {
  if (isMaintenanceExecutionAction(action)) {
    try { return await applyMaintenanceExecutionAction(externalId, action); }
    catch (error) {
      if (error instanceof OperationNotFoundError || error instanceof OperationConflictError) throw error;
      if (error instanceof MaintenanceExecutionNotFoundError) throw new OperationNotFoundError(error.message);
      if (error instanceof MaintenanceExecutionConflictError) throw new OperationConflictError(error.message);
      throw error;
    }
  }
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
      if (workOrder.stage >= 3) throw new OperationConflictError("Physical maintenance execution requires the controlled maintenance commands; generic advancement stops at the planned stage.");
      const [updated] = await tx.update(maintenanceWorkOrders).set({ stage: workOrder.stage + 1, updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, workOrder.id)).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "maintenance_work_order", entityId: workOrder.id, eventType: "maintenance_stage_advanced", actor: action.actor, payload: { fromStage: workOrder.stage, toStage: updated.stage } });
      return { action: action.type, workOrder: updated };
    }

    if (action.type === "set_procurement_state") {
      const [request] = await tx.select().from(procurementRequests).where(eq(procurementRequests.failureCaseId, failureCase.id)).limit(1);
      if (!request) throw new OperationNotFoundError("No procurement request exists for this failure case.");
      const [updated] = await tx.update(procurementRequests).set({ state: action.state, updatedAt: new Date() }).where(eq(procurementRequests.id, request.id)).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "procurement_request", entityId: request.id, eventType: `procurement_${action.state}`, actor: action.actor, payload: { previousState: request.state, nextState: action.state } });
      return { action: action.type, procurementRequest: updated };
    }

    if (action.type === "record_procurement_note") {
      const [request] = await tx.select().from(procurementRequests).where(eq(procurementRequests.failureCaseId, failureCase.id)).limit(1);
      if (!request) throw new OperationNotFoundError("No procurement request exists for this failure case.");
      const [message] = await tx.insert(procurementMessages).values({ procurementRequestId: request.id, kind: "internal_note", body: action.note, actor: action.actor }).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "procurement_message", entityId: message.id, eventType: "procurement_note_recorded", actor: action.actor, payload: { procurementRequestId: request.id } });
      return { action: action.type, procurementMessage: message };
    }

    if (action.type === "set_shipment_state") {
      const [impact] = await tx.select().from(shipmentImpacts).where(eq(shipmentImpacts.failureCaseId, failureCase.id)).limit(1);
      if (!impact) throw new OperationNotFoundError("No shipment impact exists for this failure case.");
      const stateMap = { "no-impact": "original", revised: "revised", delayed: "revised", "notification-pending": "notification_pending", notified: "notified", failed: "failed" } as const;
      const [updated] = await tx.update(shipmentImpacts).set({ state: stateMap[action.state], updatedAt: new Date() }).where(eq(shipmentImpacts.id, impact.id)).returning();
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "shipment_impact", entityId: impact.id, eventType: `shipment_${action.state}`, actor: action.actor, payload: { previousState: impact.state, nextState: action.state } });
      return { action: action.type, shipmentImpact: updated };
    }

    const [notification] = await tx.select().from(notifications).where(and(eq(notifications.id, action.notificationId), eq(notifications.failureCaseId, failureCase.id))).limit(1);
    if (!notification) throw new OperationNotFoundError("Notification does not belong to this failure case.");
    if (action.type === "retry_notification") {
      const [updated] = await tx.update(notifications).set({ state: "unread", deliveredAt: new Date(), updatedAt: new Date() }).where(eq(notifications.id, notification.id)).returning();
      const [{ nextAttempt }] = await tx.select({ nextAttempt: sql<number>`coalesce(max(${notificationAttempts.attemptNumber}), 0) + 1` }).from(notificationAttempts).where(eq(notificationAttempts.notificationId, notification.id));
      await tx.insert(notificationAttempts).values({ notificationId: notification.id, attemptNumber: nextAttempt, state: "unread", channel: notification.channel, actor: action.actor, detail: "Delivery retry requested." });
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "notification", entityId: notification.id, eventType: "notification_retry_requested", actor: action.actor, payload: { recipientRole: notification.recipientRole, channel: notification.channel } });
      return { action: action.type, notification: updated };
    }
    if (notification.state === "acknowledged") throw new OperationConflictError("Notification is already acknowledged.");
    const [updated] = await tx.update(notifications).set({ state: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: action.actor, updatedAt: new Date() }).where(eq(notifications.id, notification.id)).returning();
    const [{ nextAttempt }] = await tx.select({ nextAttempt: sql<number>`coalesce(max(${notificationAttempts.attemptNumber}), 0) + 1` }).from(notificationAttempts).where(eq(notificationAttempts.notificationId, notification.id));
    await tx.insert(notificationAttempts).values({ notificationId: notification.id, attemptNumber: nextAttempt, state: "acknowledged", channel: notification.channel, actor: action.actor, detail: "Notification acknowledged." });
    await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "notification", entityId: notification.id, eventType: "notification_acknowledged", actor: action.actor, payload: { recipientRole: notification.recipientRole, channel: notification.channel } });
    return { action: action.type, notification: updated };
  });
}
