import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, queryClient } from "@/lib/db/client";
import { failureCases, failurePredictions, maintenanceWorkOrders, parts, plants, recoveryGraphRuns, telemetryReadings, workstationAllocationLocks, workstations, workflowEvents } from "@/lib/db/schema";
import { applyMaintenanceExecutionAction, MaintenanceExecutionConflictError } from "@/lib/maintenance-execution/service";

const suffix = randomUUID().slice(0, 8);
const actor = "Validation Maintenance Lead";
const created = { plantId: "", partId: "", workstationIds: [] as string[], failureCaseIds: [] as string[], telemetryIds: [] as string[], predictionIds: [] as string[], workOrderIds: [] as string[], correlationIds: [] as string[] };

async function createIncident(label: string) {
  const [workstation] = await db.insert(workstations).values({ plantId: created.plantId, code: `VM-${label}-${suffix}`, name: `${label} maintenance validation`, line: "V", status: "CONTROLLED_SHUTDOWN_PENDING", capacityPercent: 20 }).returning();
  created.workstationIds.push(workstation.id);
  const [failureCase] = await db.insert(failureCases).values({ externalId: `VM-FC-${label}-${suffix}`, workstationId: workstation.id, partId: created.partId, severity: "critical", component: "Validation component", probability: 91, ttfHours: 10, detectedAt: new Date(), workflowState: "Awaiting maintenance execution", ownerRole: "Maintenance Lead" }).returning();
  created.failureCaseIds.push(failureCase.id);
  const sourceEventId = `vm-${label}-${suffix}`;
  const [telemetry] = await db.insert(telemetryReadings).values({ workstationId: workstation.id, sourceEventId, observedAt: new Date(), temperatureCelsius: 80, vibrationMmPerSecond: 12, pressureBar: 4, cycleCount: 1, motorCurrentAmps: 10, activeErrorCodes: ["VALIDATION"], anomalySeverity: "critical", anomalyReasons: ["validation fixture"] }).returning();
  created.telemetryIds.push(telemetry.id);
  const [prediction] = await db.insert(failurePredictions).values({ telemetryReadingId: telemetry.id, failureCaseId: failureCase.id, workstationId: workstation.id, partId: created.partId, component: failureCase.component, severity: "critical", probability: 91, ttfHours: 10, providerName: "ValidationProvider", providerVersion: "validation", rationale: ["validation fixture"] }).returning();
  created.predictionIds.push(prediction.id);
  const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `VM-WO-${label}-${suffix}`, failureCaseId: failureCase.id, workstationId: workstation.id, partId: created.partId, assignee: actor, checklist: ["Controlled repair", "Supervised validation"], stage: 1, scenario: "local_spare" }).returning();
  created.workOrderIds.push(workOrder.id);
  const correlationId = `validate:maintenance:${label}:${suffix}`;
  created.correlationIds.push(correlationId);
  const graphRunId = randomUUID();
  await db.insert(recoveryGraphRuns).values({ id: graphRunId, correlationId, telemetrySourceEventId: sourceEventId, status: "completed", state: { correlationId, graphRunId, telemetrySourceEventId: sourceEventId, failureCaseExternalId: failureCase.externalId, maintenanceWorkOrderId: workOrder.id, workflowStatus: "AWAITING_MAINTENANCE_EXECUTION", errors: [] }, completedAt: new Date() });
  const [allocationLock] = await db.insert(workstationAllocationLocks).values({ workstationId: workstation.id, failureCaseId: failureCase.id, failurePredictionId: prediction.id, correlationId, state: "active", policyDisposition: "CONTROLLED_SHUTDOWN_PENDING", reason: "Validation fixture lock" }).returning();
  return { workstation, failureCase, workOrder, correlationId, graphRunId, allocationLock };
}

async function expectConflict(operation: () => Promise<unknown>, message: string) {
  try { await operation(); }
  catch (error) { if (error instanceof MaintenanceExecutionConflictError) return; throw error; }
  throw new Error(message);
}

async function main() {
  try {
    const [plant] = await db.insert(plants).values({ code: `VM-${suffix}`, name: "Maintenance execution validation" }).returning(); created.plantId = plant.id;
    const [part] = await db.insert(parts).values({ code: `VM-P-${suffix}`, name: "Maintenance validation part" }).returning(); created.partId = part.id;

    const happy = await createIncident("PASS");
    const started = await applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "start_maintenance", actor, workOrderId: happy.workOrder.id, expectedStage: 1, notes: "Lockout confirmed and maintenance started." });
    await expectConflict(() => applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: happy.workOrder.id, expectedStage: 3, passed: true, notes: "Unsafe early validation attempt." }), "Validation before repair/testing was not rejected.");
    const repaired = await applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "record_repair_completion", actor, workOrderId: happy.workOrder.id, expectedStage: 3, notes: "Replacement installed and controlled repair evidence recorded." });
    const testing = await applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "start_machine_testing", actor, workOrderId: happy.workOrder.id, expectedStage: 4, notes: "Supervised machine test started." });
    const passed = await applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: happy.workOrder.id, expectedStage: 5, passed: true, notes: "Functional and quality validation passed." });
    const duplicate = await applyMaintenanceExecutionAction(happy.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: happy.workOrder.id, expectedStage: 7, passed: true, notes: "Duplicate completion retry." });
    if (started.workOrder.stage !== 3 || repaired.workOrder.stage !== 4 || testing.workOrder.stage !== 5 || passed.workOrder.stage !== 7 || passed.allocationLock.state !== "released" || passed.workstation.status !== "OPERATIONAL" || passed.failureCase.workflowState !== "Recovered / returned to service" || passed.recoveryState !== "RECOVERED" || !duplicate.idempotent) throw new Error("Happy-path maintenance state transitions or duplicate completion safety failed.");
    const [happyGraph] = await db.select().from(recoveryGraphRuns).where(eq(recoveryGraphRuns.correlationId, happy.correlationId));
    const happyEvents = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, happy.failureCase.id));
    const requiredEvents = ["maintenance_started", "repair_completed", "machine_testing_started", "machine_testing_completed", "return_to_service_validation_passed", "maintenance_work_order_completed", "workstation_allocation_lock_released", "workstation_returned_to_service", "recovery_completed"];
    if ((happyGraph.state as Record<string, unknown>).workflowStatus !== "RECOVERED" || requiredEvents.some((type) => happyEvents.filter((event) => event.eventType === type).length !== 1) || happyEvents.some((event) => event.payload.correlationId !== happy.correlationId)) throw new Error("Happy-path graph lifecycle or correlation audit evidence failed.");

    const failed = await createIncident("FAIL");
    await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "start_maintenance", actor, workOrderId: failed.workOrder.id, expectedStage: 1 });
    await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "record_repair_completion", actor, workOrderId: failed.workOrder.id, expectedStage: 3, notes: "Repair complete." });
    await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "start_machine_testing", actor, workOrderId: failed.workOrder.id, expectedStage: 4 });
    const validationFailed = await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: failed.workOrder.id, expectedStage: 5, passed: false, notes: "Vibration remained outside the approved limit." });
    const duplicateFailure = await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: failed.workOrder.id, expectedStage: 5, passed: false, notes: "Duplicate failed-validation retry." });
    const failedEventsBeforeRework = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failed.failureCase.id));
    if (!duplicateFailure.idempotent || failedEventsBeforeRework.filter((event) => event.eventType === "return_to_service_validation_failed").length !== 1) throw new Error("Duplicate failed validation created duplicate evidence.");
    const rework = await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "record_repair_completion", actor, workOrderId: failed.workOrder.id, expectedStage: 5, notes: "Rework completed after failed validation." });
    await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "start_machine_testing", actor, workOrderId: failed.workOrder.id, expectedStage: 4, notes: "Second supervised test started." });
    const secondValidationFailed = await applyMaintenanceExecutionAction(failed.failureCase.externalId, { type: "record_return_to_service_validation", actor, workOrderId: failed.workOrder.id, expectedStage: 5, passed: false, notes: "Second validation attempt remained outside limits." });
    const [failedGraph] = await db.select().from(recoveryGraphRuns).where(eq(recoveryGraphRuns.correlationId, failed.correlationId));
    const failedEvents = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failed.failureCase.id));
    if (validationFailed.workOrder.stage !== 5 || validationFailed.allocationLock.state !== "active" || validationFailed.workstation.status === "OPERATIONAL" || validationFailed.recoveryState !== "REQUIRES_INTERVENTION" || rework.recoveryState !== "AWAITING_MAINTENANCE_EXECUTION" || secondValidationFailed.recoveryState !== "REQUIRES_INTERVENTION" || (failedGraph.state as Record<string, unknown>).workflowStatus !== "REQUIRES_INTERVENTION" || failedEvents.filter((event) => event.eventType === "return_to_service_validation_failed").length !== 2) throw new Error("Failed-validation lock, workstation, graph, evidence, rework, or idempotency safety failed.");

    const wrongLock = await createIncident("WRONG");
    await db.update(workstationAllocationLocks).set({ failureCaseId: happy.failureCase.id }).where(eq(workstationAllocationLocks.id, wrongLock.allocationLock.id));
    await expectConflict(() => applyMaintenanceExecutionAction(wrongLock.failureCase.externalId, { type: "start_maintenance", actor, workOrderId: wrongLock.workOrder.id, expectedStage: 1 }), "A lock belonging to another incident was accepted.");
    console.log("Maintenance execution validation passed: ordered happy path, PASS completion, failed validation, active-lock retention, invalid ordering, duplicate safety, wrong-incident lock rejection, graph lifecycle, and correlation audit evidence.");
  } finally {
    if (created.failureCaseIds.length) await db.delete(workflowEvents).where(inArray(workflowEvents.failureCaseId, created.failureCaseIds));
    if (created.workstationIds.length) await db.delete(workstationAllocationLocks).where(inArray(workstationAllocationLocks.workstationId, created.workstationIds));
    if (created.correlationIds.length) await db.delete(recoveryGraphRuns).where(inArray(recoveryGraphRuns.correlationId, created.correlationIds));
    if (created.workOrderIds.length) await db.delete(maintenanceWorkOrders).where(inArray(maintenanceWorkOrders.id, created.workOrderIds));
    if (created.predictionIds.length) await db.delete(failurePredictions).where(inArray(failurePredictions.id, created.predictionIds));
    if (created.failureCaseIds.length) await db.delete(failureCases).where(inArray(failureCases.id, created.failureCaseIds));
    if (created.telemetryIds.length) await db.delete(telemetryReadings).where(inArray(telemetryReadings.id, created.telemetryIds));
    if (created.workstationIds.length) await db.delete(workstations).where(inArray(workstations.id, created.workstationIds));
    if (created.partId) await db.delete(parts).where(eq(parts.id, created.partId));
    if (created.plantId) await db.delete(plants).where(eq(plants.id, created.plantId));
    await queryClient.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
