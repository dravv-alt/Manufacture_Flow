import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, queryClient } from "@/lib/db/client";
import { agentRuns, failureCases, maintenanceWorkOrders, parts, plants, productionJobs, recoveryTimeEstimates, rerouteDecisions, shipmentCommitments, shipmentImpacts, workflowEvents, workstations } from "@/lib/db/schema";
import { runDeliveryImpact } from "@/lib/delivery-impact/service";

const suffix = randomUUID().slice(0, 8);
const correlationId = `validate:delivery:${suffix}`;

async function main() {
  const ids: Record<string, string> = {};
  try {
    const [plant] = await db.insert(plants).values({ code: `VD-${suffix}`, name: "Delivery validation" }).returning(); ids.plant = plant.id;
    const [station] = await db.insert(workstations).values({ plantId: plant.id, code: `VD-S-${suffix}`, name: "Source", line: "V", status: "Operational", capacityPercent: 10 }).returning(); ids.station = station.id;
    const [part] = await db.insert(parts).values({ code: `VD-P-${suffix}`, name: "Part" }).returning(); ids.part = part.id;
    const [failureCase] = await db.insert(failureCases).values({ externalId: `VD-FC-${suffix}`, workstationId: station.id, partId: part.id, severity: "critical", component: "Validation", probability: 90, ttfHours: 12, detectedAt: new Date(), workflowState: "Validation", ownerRole: "Scheduler" }).returning(); ids.failureCase = failureCase.id;
    const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `VD-WO-${suffix}`, failureCaseId: failureCase.id, workstationId: station.id, partId: part.id, assignee: "Validation", scenario: "local_spare" }).returning(); ids.workOrder = workOrder.id;
    const projectedCompletionAt = new Date("2026-08-20T10:00:00.000Z");
    const [estimate] = await db.insert(recoveryTimeEstimates).values({ failureCaseId: failureCase.id, maintenanceWorkOrderId: workOrder.id, correlationId, revision: 1, scenario: "local_spare", calculationVersion: "validation", inputHash: randomUUID().replaceAll("-", ""), calculationInputs: {}, expectedRecoveryAt: projectedCompletionAt, durationMinutes: 60 }).returning(); ids.estimate = estimate.id;
    const jobs = await db.insert(productionJobs).values(["on-time", "at-risk", "delayed", "multi-a", "multi-b"].map((name) => ({ externalId: `VD-J-${name}-${suffix}`, workstationId: station.id, state: "queued" as const, operationCode: "V", toolingCode: "V", requiredSkill: "V" }))).returning();
    ids.jobs = jobs.map((job) => job.id).join(",");
    const decisions = await db.insert(rerouteDecisions).values(jobs.map((job) => ({ failureCaseId: failureCase.id, productionJobId: job.id, sourceWorkstationId: station.id, targetWorkstationId: station.id, correlationId, outcome: "rerouted", rationale: { projectedJobCompletionAt: projectedCompletionAt.toISOString() } }))).returning();
    const byName = new Map(jobs.map((job) => [job.externalId.split("-").slice(2, -1).join("-"), job.id]));
    const [onTime, atRisk, delayed, multi] = await db.insert(shipmentCommitments).values([
      { externalId: `VD-SO-ON-${suffix}`, productionJobIds: [byName.get("on-time")!], originalCommittedAt: new Date("2026-08-20T14:30:00.000Z") },
      { externalId: `VD-SO-RISK-${suffix}`, productionJobIds: [byName.get("at-risk")!], originalCommittedAt: new Date("2026-08-20T11:00:00.000Z") },
      { externalId: `VD-SO-LATE-${suffix}`, productionJobIds: [byName.get("delayed")!], originalCommittedAt: new Date("2026-08-20T09:30:00.000Z") },
      { externalId: `VD-SO-MULTI-${suffix}`, productionJobIds: [byName.get("multi-a")!, byName.get("multi-b")!], originalCommittedAt: new Date("2026-08-20T14:30:00.000Z") },
    ]).returning();
    ids.commitments = [onTime.id, atRisk.id, delayed.id, multi.id].join(",");
    const first = await runDeliveryImpact({ recoveryTimeEstimateId: estimate.id, rerouteDecisionIds: decisions.map((decision) => decision.id), correlationId, failureCaseExternalId: failureCase.externalId });
    const duplicate = await runDeliveryImpact({ recoveryTimeEstimateId: estimate.id, rerouteDecisionIds: decisions.map((decision) => decision.id), correlationId, failureCaseExternalId: failureCase.externalId });
    const impacts = await db.select().from(shipmentImpacts).where(eq(shipmentImpacts.correlationId, correlationId));
    const classifications = new Map(impacts.map((impact) => [impact.shipmentCommitmentId, impact.classification]));
    const multiImpact = impacts.find((impact) => impact.shipmentCommitmentId === multi.id);
    if (first.idempotent || !duplicate.idempotent || impacts.length !== 4 || classifications.get(onTime.id) !== "ON_TIME" || classifications.get(atRisk.id) !== "AT_RISK" || classifications.get(delayed.id) !== "DELAYED" || !multiImpact || multiImpact.affectedJobIds?.length !== 2) throw new Error("Delivery-impact linkage, classifications, multiple-job aggregation, or idempotency validation failed.");
    const events = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id));
    const runs = await db.select().from(agentRuns).where(eq(agentRuns.correlationId, correlationId));
    if (!events.some((event) => event.eventType === "delivery_impact_calculated") || !runs.some((run) => run.agentName === "DeliveryImpactAgent" && run.status === "completed")) throw new Error("Delivery-impact agent run or workflow event persistence validation failed.");
    const missingCorrelationId = `${correlationId}:missing`;
    const [missingWorkOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `VD-WO-MISSING-${suffix}`, failureCaseId: failureCase.id, workstationId: station.id, partId: part.id, assignee: "Validation", scenario: "local_spare" }).returning(); ids.missingWorkOrder = missingWorkOrder.id;
    const [missingEstimate] = await db.insert(recoveryTimeEstimates).values({ failureCaseId: failureCase.id, maintenanceWorkOrderId: missingWorkOrder.id, correlationId: missingCorrelationId, revision: 1, scenario: "local_spare", calculationVersion: "validation", inputHash: randomUUID().replaceAll("-", ""), calculationInputs: {}, expectedRecoveryAt: projectedCompletionAt, durationMinutes: 60 }).returning(); ids.missingEstimate = missingEstimate.id;
    const noLinkedShipment = await runDeliveryImpact({ recoveryTimeEstimateId: missingEstimate.id, rerouteDecisionIds: [], correlationId: missingCorrelationId, failureCaseExternalId: failureCase.externalId });
    const missingEvents = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id));
    if (!noLinkedShipment.noLinkedShipment || !missingEvents.some((event) => event.eventType === "delivery_impact_no_linked_shipment")) throw new Error("No-linked-shipment handling validation failed.");
    console.log("Delivery impact validation passed: ON_TIME, AT_RISK, DELAYED, multiple jobs, no linked shipment, duplicate idempotency, PostgreSQL linkage, agent run, and workflow event.");
  } finally {
    if (ids.failureCase) await db.delete(workflowEvents).where(eq(workflowEvents.failureCaseId, ids.failureCase));
    if (ids.estimate) await db.delete(agentRuns).where(eq(agentRuns.sourceEventId, `delivery-impact:${ids.estimate}`));
    if (ids.missingEstimate) await db.delete(agentRuns).where(eq(agentRuns.sourceEventId, `delivery-impact:${ids.missingEstimate}`));
    if (ids.commitments) await db.delete(shipmentImpacts).where(inArray(shipmentImpacts.shipmentCommitmentId, ids.commitments.split(",")));
    if (ids.commitments) await db.delete(shipmentCommitments).where(inArray(shipmentCommitments.id, ids.commitments.split(",")));
    if (ids.jobs) await db.delete(rerouteDecisions).where(inArray(rerouteDecisions.productionJobId, ids.jobs.split(",")));
    if (ids.jobs) await db.delete(productionJobs).where(inArray(productionJobs.id, ids.jobs.split(",")));
    if (ids.estimate) await db.delete(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.id, ids.estimate));
    if (ids.missingEstimate) await db.delete(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.id, ids.missingEstimate));
    if (ids.workOrder) await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.id, ids.workOrder));
    if (ids.missingWorkOrder) await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.id, ids.missingWorkOrder));
    if (ids.failureCase) await db.delete(failureCases).where(eq(failureCases.id, ids.failureCase));
    if (ids.part) await db.delete(parts).where(eq(parts.id, ids.part));
    if (ids.station) await db.delete(workstations).where(eq(workstations.id, ids.station));
    if (ids.plant) await db.delete(plants).where(eq(plants.id, ids.plant));
    await queryClient.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
