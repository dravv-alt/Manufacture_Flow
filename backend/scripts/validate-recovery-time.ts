import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { runRecoveryTimeEstimation } from "@/lib/recovery-time-estimation/service";
import { db, queryClient } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, inventoryItems, inventoryReservations, maintenanceWorkOrders, parts, plants, procurementAutomationResults, procurementRequests, recoveryTimeEstimates, resourceRecoveryResults, telemetryReadings, vendors, workflowEvents, workstations } from "@/lib/db/schema";

type Scenario = { failureCaseId: string; failureCaseExternalId: string; workOrderId: string; correlationId: string; procurementResultId?: string };

const suffix = randomUUID().slice(0, 8).toUpperCase();
const created: { plantIds: string[]; workstationIds: string[]; partIds: string[]; failureCaseIds: string[]; telemetryIds: string[]; predictionIds: string[]; inventoryIds: string[]; reservationIds: string[]; recoveryIds: string[]; requestIds: string[]; procurementResultIds: string[]; workOrderIds: string[]; vendorIds: string[]; correlations: string[] } = { plantIds: [], workstationIds: [], partIds: [], failureCaseIds: [], telemetryIds: [], predictionIds: [], inventoryIds: [], reservationIds: [], recoveryIds: [], requestIds: [], procurementResultIds: [], workOrderIds: [], vendorIds: [], correlations: [] };

async function createScenario(kind: "local_spare" | "procurement"): Promise<Scenario> {
  const correlationId = `validation:recovery-time:${kind}:${suffix}`;
  const baseTime = new Date("2026-08-20T00:00:00.000Z");
  const [plant] = await db.insert(plants).values({ code: `RTE-${kind}-${suffix}`, name: "Recovery estimate validation plant" }).returning();
  const [station] = await db.insert(workstations).values({ plantId: plant.id, code: `RTE-WS-${kind}-${suffix}`, name: "Recovery estimate validation workstation", line: "Validation", status: "CONTROLLED_SHUTDOWN_PENDING", capacityPercent: 0 }).returning();
  const [part] = await db.insert(parts).values({ code: `RTE-PART-${kind}-${suffix}`, name: "Recovery estimate validation part" }).returning();
  const [failureCase] = await db.insert(failureCases).values({ externalId: `RTE-FC-${kind}-${suffix}`, workstationId: station.id, partId: part.id, severity: "critical", component: "Validation bearing", probability: 95, ttfHours: 18, detectedAt: baseTime, workflowState: "Validation", ownerRole: "Maintenance Lead" }).returning();
  const [telemetry] = await db.insert(telemetryReadings).values({ workstationId: station.id, sourceEventId: `rte-telemetry-${kind}-${suffix}`, observedAt: baseTime, temperatureCelsius: 95, vibrationMmPerSecond: 12, pressureBar: 5, cycleCount: 10, motorCurrentAmps: 20, activeErrorCodes: ["RTE"], anomalySeverity: "critical", anomalyReasons: ["validation"] }).returning();
  const [prediction] = await db.insert(failurePredictions).values({ telemetryReadingId: telemetry.id, failureCaseId: failureCase.id, workstationId: station.id, partId: part.id, component: failureCase.component, severity: "critical", probability: 95, ttfHours: 18, providerName: "validation", providerVersion: "v1", rationale: ["validation"] }).returning();

  created.plantIds.push(plant.id); created.workstationIds.push(station.id); created.partIds.push(part.id); created.failureCaseIds.push(failureCase.id); created.telemetryIds.push(telemetry.id); created.predictionIds.push(prediction.id); created.correlations.push(correlationId);

  if (kind === "local_spare") {
    const [inventory] = await db.insert(inventoryItems).values({ partId: part.id, plantId: plant.id, location: "Validation store", onHand: 1, reserved: 1, state: "reserved" }).returning();
    const [reservation] = await db.insert(inventoryReservations).values({ inventoryItemId: inventory.id, failureCaseId: failureCase.id, quantity: 1, actor: "Validation" }).returning();
    const [recovery] = await db.insert(resourceRecoveryResults).values({ failurePredictionId: prediction.id, failureCaseId: failureCase.id, inventoryItemId: inventory.id, inventoryReservationId: reservation.id, correlationId, outcome: "reserved", requiredQuantity: 1, availableQuantity: 1, reason: "Validation local spare" }).returning();
    const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `RTE-WO-${kind}-${suffix}`, failureCaseId: failureCase.id, workstationId: station.id, partId: part.id, assignee: "Validation", priority: "critical", diagnosis: "Validation", resourceRecoveryResultId: recovery.id, plannedWindowStart: new Date("2026-08-20T02:00:00.000Z"), plannedWindowEnd: new Date("2026-08-20T04:00:00.000Z"), checklist: ["Validate"], scenario: "local_spare" }).returning();
    created.inventoryIds.push(inventory.id); created.reservationIds.push(reservation.id); created.recoveryIds.push(recovery.id); created.workOrderIds.push(workOrder.id);
    return { failureCaseId: failureCase.id, failureCaseExternalId: failureCase.externalId, workOrderId: workOrder.id, correlationId };
  }

  const [vendor] = await db.insert(vendors).values({ name: `RTE Vendor ${suffix}`, contactEmail: "rte-validation@example.test", approved: true, active: true }).returning();
  const [recovery] = await db.insert(resourceRecoveryResults).values({ failurePredictionId: prediction.id, failureCaseId: failureCase.id, correlationId, outcome: "procurement_required", requiredQuantity: 1, availableQuantity: 0, reason: "Validation procurement" }).returning();
  const [request] = await db.insert(procurementRequests).values({ externalId: `RTE-PR-${suffix}`, failureCaseId: failureCase.id, partId: part.id, quantity: 1, vendor: vendor.name, state: "sent", requiredBy: baseTime }).returning();
  const rankedOptions = [{ vendorId: vendor.id, vendorName: vendor.name, leadTimeHours: 8, unitCostCents: 1000, reliabilityScore: 95 }];
  const [procurementResult] = await db.insert(procurementAutomationResults).values({ resourceRecoveryResultId: recovery.id, failureCaseId: failureCase.id, selectedVendorId: vendor.id, procurementRequestId: request.id, correlationId, outcome: "requisition_created", rankedOptions, reason: "Validation" }).returning();
  const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `RTE-WO-${kind}-${suffix}`, failureCaseId: failureCase.id, workstationId: station.id, partId: part.id, assignee: "Validation", priority: "critical", diagnosis: "Validation", resourceRecoveryResultId: recovery.id, procurementAutomationResultId: procurementResult.id, plannedWindowStart: new Date("2026-08-20T02:00:00.000Z"), plannedWindowEnd: new Date("2026-08-20T04:00:00.000Z"), checklist: ["Validate"], scenario: "procurement" }).returning();
  created.vendorIds.push(vendor.id); created.recoveryIds.push(recovery.id); created.requestIds.push(request.id); created.procurementResultIds.push(procurementResult.id); created.workOrderIds.push(workOrder.id);
  return { failureCaseId: failureCase.id, failureCaseExternalId: failureCase.externalId, workOrderId: workOrder.id, correlationId, procurementResultId: procurementResult.id };
}

async function cleanup() {
  if (created.correlations.length) await db.delete(agentRuns).where(inArray(agentRuns.correlationId, created.correlations));
  if (created.failureCaseIds.length) await db.delete(workflowEvents).where(inArray(workflowEvents.failureCaseId, created.failureCaseIds));
  if (created.workOrderIds.length) await db.delete(recoveryTimeEstimates).where(inArray(recoveryTimeEstimates.maintenanceWorkOrderId, created.workOrderIds));
  if (created.workOrderIds.length) await db.delete(maintenanceWorkOrders).where(inArray(maintenanceWorkOrders.id, created.workOrderIds));
  if (created.procurementResultIds.length) await db.delete(procurementAutomationResults).where(inArray(procurementAutomationResults.id, created.procurementResultIds));
  if (created.requestIds.length) await db.delete(procurementRequests).where(inArray(procurementRequests.id, created.requestIds));
  if (created.recoveryIds.length) await db.delete(resourceRecoveryResults).where(inArray(resourceRecoveryResults.id, created.recoveryIds));
  if (created.reservationIds.length) await db.delete(inventoryReservations).where(inArray(inventoryReservations.id, created.reservationIds));
  if (created.inventoryIds.length) await db.delete(inventoryItems).where(inArray(inventoryItems.id, created.inventoryIds));
  if (created.predictionIds.length) await db.delete(failurePredictions).where(inArray(failurePredictions.id, created.predictionIds));
  if (created.telemetryIds.length) await db.delete(telemetryReadings).where(inArray(telemetryReadings.id, created.telemetryIds));
  if (created.failureCaseIds.length) await db.delete(failureCases).where(inArray(failureCases.id, created.failureCaseIds));
  if (created.vendorIds.length) await db.delete(vendors).where(inArray(vendors.id, created.vendorIds));
  if (created.partIds.length) await db.delete(parts).where(inArray(parts.id, created.partIds));
  if (created.workstationIds.length) await db.delete(workstations).where(inArray(workstations.id, created.workstationIds));
  if (created.plantIds.length) await db.delete(plants).where(inArray(plants.id, created.plantIds));
}

async function main() {
  try {
    const local = await createScenario("local_spare");
    const localFirst = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: local.workOrderId, correlationId: local.correlationId, failureCaseExternalId: local.failureCaseExternalId });
    const localRepeat = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: local.workOrderId, correlationId: local.correlationId, failureCaseExternalId: local.failureCaseExternalId });
    if (localFirst.idempotent || !localRepeat.idempotent || localFirst.estimate.revision !== 1) throw new Error("Local-spare idempotency validation failed.");

    const procurement = await createScenario("procurement");
    const procurementFirst = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: procurement.workOrderId, correlationId: procurement.correlationId, failureCaseExternalId: procurement.failureCaseExternalId });
    const procurementRepeat = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: procurement.workOrderId, correlationId: procurement.correlationId, failureCaseExternalId: procurement.failureCaseExternalId });
    if (procurementFirst.idempotent || !procurementRepeat.idempotent || procurementFirst.estimate.revision !== 1 || !procurement.procurementResultId) throw new Error("Procurement idempotency validation failed.");
    await db.update(procurementAutomationResults).set({ rankedOptions: [{ vendorId: created.vendorIds[0], vendorName: `RTE Vendor ${suffix}`, leadTimeHours: 12, unitCostCents: 1000, reliabilityScore: 95 }] }).where(eq(procurementAutomationResults.id, procurement.procurementResultId));
    const revised = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: procurement.workOrderId, correlationId: procurement.correlationId, failureCaseExternalId: procurement.failureCaseExternalId });
    if (revised.idempotent || revised.estimate.revision !== 2 || revised.estimate.expectedRecoveryAt <= procurementFirst.estimate.expectedRecoveryAt) throw new Error("Revised-input validation failed.");
    console.log(`Recovery time validation passed: local revision ${localFirst.estimate.revision}, procurement revision ${procurementFirst.estimate.revision}, revised procurement revision ${revised.estimate.revision}.`);
  } finally {
    await cleanup();
    await queryClient.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
