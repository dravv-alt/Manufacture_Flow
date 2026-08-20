import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, queryClient } from "@/lib/db/client";
import { failureCases, maintenanceWorkOrders, parts, plants, productionJobs, recoveryTimeEstimates, rerouteDecisions, workstationCapabilities, workstations, workflowEvents, agentRuns, reroutePlans } from "@/lib/db/schema";
import { runProductionRerouting } from "@/lib/production-rerouting/service";

const suffix = randomUUID().slice(0, 8); const correlationId = `validate:reroute:${suffix}`;
async function main() {
  let ids: Record<string, string> = {};
  try {
    const [plant] = await db.insert(plants).values({ code: `VR-${suffix}`, name: "Validation" }).returning();
    const [source] = await db.insert(workstations).values({ plantId: plant.id, code: `VR-S-${suffix}`, name: "Source", line: "V", status: "CONTROLLED_SHUTDOWN_PENDING", capacityPercent: 0 }).returning();
    const [target] = await db.insert(workstations).values({ plantId: plant.id, code: `VR-T-${suffix}`, name: "Target", line: "V", status: "Operational", capacityPercent: 40 }).returning();
    const [part] = await db.insert(parts).values({ code: `VR-P-${suffix}`, name: "Part" }).returning();
    const [failureCase] = await db.insert(failureCases).values({ externalId: `VR-FC-${suffix}`, workstationId: source.id, partId: part.id, severity: "critical", component: "Validation", probability: 90, ttfHours: 12, detectedAt: new Date(), workflowState: "Validation", ownerRole: "Scheduler" }).returning();
    const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `VR-WO-${suffix}`, failureCaseId: failureCase.id, workstationId: source.id, partId: part.id, assignee: "Validation", scenario: "local_spare" }).returning();
    const [estimate] = await db.insert(recoveryTimeEstimates).values({ failureCaseId: failureCase.id, maintenanceWorkOrderId: workOrder.id, correlationId, revision: 1, scenario: "local_spare", calculationVersion: "validation", inputHash: randomUUID().replaceAll("-", ""), calculationInputs: {}, expectedRecoveryAt: new Date(), durationMinutes: 60 }).returning();
    const [job] = await db.insert(productionJobs).values({ externalId: `VR-J-${suffix}`, workstationId: source.id, state: "queued", rerouteEvaluationRequired: true, operationCode: "CNC", toolingCode: "T1", requiredSkill: "SK1", estimatedLoadPercent: 20 }).returning();
    await db.insert(workstationCapabilities).values({ workstationId: target.id, operationCode: "CNC", toolingCode: "T1", qualifiedSkill: "SK1" });
    ids = { plant: plant.id, source: source.id, target: target.id, part: part.id, failureCase: failureCase.id, workOrder: workOrder.id, estimate: estimate.id, job: job.id };
    const first = await runProductionRerouting({ recoveryTimeEstimateId: estimate.id, correlationId, failureCaseExternalId: failureCase.externalId });
    const duplicate = await runProductionRerouting({ recoveryTimeEstimateId: estimate.id, correlationId, failureCaseExternalId: failureCase.externalId });
    const [moved] = await db.select().from(productionJobs).where(eq(productionJobs.id, job.id));
    if (first.idempotent || !duplicate.idempotent || moved.workstationId !== target.id || moved.rerouteEvaluationRequired || first.decisions.length !== 1 || first.decisions[0]?.outcome !== "rerouted") throw new Error("Production rerouting integration validation failed.");
    console.log("Production rerouting validation passed: persisted decision, reassigned job, cleared flag, duplicate trigger idempotent.");
  } finally {
    if (ids.failureCase) await db.delete(workflowEvents).where(eq(workflowEvents.failureCaseId, ids.failureCase));
    if (ids.estimate) await db.delete(agentRuns).where(eq(agentRuns.sourceEventId, ids.estimate));
    if (ids.failureCase) await db.delete(reroutePlans).where(eq(reroutePlans.failureCaseId, ids.failureCase));
    if (ids.job) await db.delete(rerouteDecisions).where(eq(rerouteDecisions.productionJobId, ids.job));
    if (ids.job) await db.delete(productionJobs).where(eq(productionJobs.id, ids.job));
    if (ids.target) await db.delete(workstationCapabilities).where(eq(workstationCapabilities.workstationId, ids.target));
    if (ids.estimate) await db.delete(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.id, ids.estimate));
    if (ids.workOrder) await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.id, ids.workOrder));
    if (ids.failureCase) await db.delete(failureCases).where(eq(failureCases.id, ids.failureCase));
    if (ids.part) await db.delete(parts).where(eq(parts.id, ids.part));
    if (ids.source) await db.delete(workstations).where(eq(workstations.id, ids.source)); if (ids.target) await db.delete(workstations).where(eq(workstations.id, ids.target));
    if (ids.plant) await db.delete(plants).where(eq(plants.id, ids.plant)); await queryClient.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
