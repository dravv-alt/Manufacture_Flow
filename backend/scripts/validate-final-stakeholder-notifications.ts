import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, queryClient } from "@/lib/db/client";
import { agentRuns, failureCases, maintenanceWorkOrders, notificationAttempts, notifications, parts, plants, productionJobs, recoveryTimeEstimates, rerouteDecisions, shipmentCommitments, shipmentImpacts, workflowEvents, workstations } from "@/lib/db/schema";
import { runFinalStakeholderNotifications } from "@/lib/final-stakeholder-notifications/service";

const suffix = randomUUID().slice(0, 8);
const correlationId = `validate:final-notifications:${suffix}`;

async function main() {
  const ids: Record<string, string> = {};
  try {
    const [plant] = await db.insert(plants).values({ code: `VN-${suffix}`, name: "Final notification validation" }).returning(); ids.plant = plant.id;
    const [source] = await db.insert(workstations).values({ plantId: plant.id, code: `VN-SRC-${suffix}`, name: "Source", line: "V", status: "Recovery", capacityPercent: 40 }).returning(); ids.source = source.id;
    const [target] = await db.insert(workstations).values({ plantId: plant.id, code: `VN-DST-${suffix}`, name: "Target", line: "V", status: "Operational", capacityPercent: 50 }).returning(); ids.target = target.id;
    const [part] = await db.insert(parts).values({ code: `VN-P-${suffix}`, name: "Validation part" }).returning(); ids.part = part.id;
    const [failureCase] = await db.insert(failureCases).values({ externalId: `VN-FC-${suffix}`, workstationId: source.id, partId: part.id, severity: "critical", component: "Validation", probability: 90, ttfHours: 12, detectedAt: new Date(), workflowState: "Validation", ownerRole: "Scheduler" }).returning(); ids.failureCase = failureCase.id;
    const [workOrder] = await db.insert(maintenanceWorkOrders).values({ externalId: `VN-WO-${suffix}`, failureCaseId: failureCase.id, workstationId: source.id, partId: part.id, assignee: "Validation", scenario: "local_spare" }).returning(); ids.workOrder = workOrder.id;
    const [estimate] = await db.insert(recoveryTimeEstimates).values({ failureCaseId: failureCase.id, maintenanceWorkOrderId: workOrder.id, correlationId, revision: 1, scenario: "local_spare", calculationVersion: "validation", inputHash: randomUUID().replaceAll("-", ""), calculationInputs: {}, expectedRecoveryAt: new Date("2026-08-20T12:00:00.000Z"), durationMinutes: 60 }).returning(); ids.estimate = estimate.id;
    const [job] = await db.insert(productionJobs).values({ externalId: `VN-J-${suffix}`, workstationId: target.id, state: "queued", operationCode: "V", toolingCode: "V", requiredSkill: "V" }).returning(); ids.job = job.id;
    const [decision] = await db.insert(rerouteDecisions).values({ failureCaseId: failureCase.id, productionJobId: job.id, sourceWorkstationId: source.id, targetWorkstationId: target.id, correlationId, outcome: "rerouted", rationale: { projectedJobCompletionAt: "2026-08-20T12:00:00.000Z" } }).returning(); ids.decision = decision.id;
    const [commitment] = await db.insert(shipmentCommitments).values({ externalId: `VN-SO-${suffix}`, productionJobIds: [job.id], originalCommittedAt: new Date("2026-08-20T11:00:00.000Z") }).returning(); ids.commitment = commitment.id;
    const [impact] = await db.insert(shipmentImpacts).values({ externalId: `VN-SI-${suffix}`, failureCaseId: failureCase.id, originalEta: commitment.originalCommittedAt, revisedEta: new Date("2026-08-20T12:00:00.000Z"), deltaHours: 1, state: "revised", correlationId, recoveryTimeEstimateId: estimate.id, shipmentCommitmentId: commitment.id, rerouteDecisionIds: [decision.id], affectedJobIds: [job.id], originalCommittedAt: commitment.originalCommittedAt, revisedProjectedAt: new Date("2026-08-20T12:00:00.000Z"), classification: "DELAYED", delayMinutes: 60, rationale: { calculationVersion: "validation" } }).returning(); ids.impact = impact.id;
    const input = { deliveryImpactIds: [impact.id], rerouteDecisionIds: [decision.id], correlationId, failureCaseExternalId: failureCase.externalId };
    const first = await runFinalStakeholderNotifications(input);
    const duplicate = await runFinalStakeholderNotifications(input);
    const createdNotifications = await db.select().from(notifications).where(inArray(notifications.id, first.notifications.map((notification) => notification.id)));
    const attempts = await db.select().from(notificationAttempts).where(inArray(notificationAttempts.notificationId, createdNotifications.map((notification) => notification.id)));
    const roles = createdNotifications.map((notification) => notification.recipientRole).sort();
    if (first.idempotent || !duplicate.idempotent || createdNotifications.length !== 3 || attempts.length !== 3 || roles.join(",") !== ["Logistics Team", "Plant Manager", "Scheduler"].join(",") || createdNotifications.some((notification) => notification.channel !== "local_queue" || notification.state !== "unread" || notification.deliveredAt !== null)) throw new Error("Controlled local queue, recipients, or duplicate idempotency validation failed.");
    const evidence = JSON.parse(attempts[0]!.detail) as { correlationId?: string; commitments?: unknown[]; reroutes?: unknown[]; queueState?: string };
    if (evidence.correlationId !== correlationId || evidence.queueState !== "queued_local" || evidence.commitments?.length !== 1 || evidence.reroutes?.length !== 1) throw new Error("Final notification commitment, reroute, or correlation evidence validation failed.");
    const noImpact = await runFinalStakeholderNotifications({ deliveryImpactIds: [], rerouteDecisionIds: [], correlationId: `${correlationId}:none`, failureCaseExternalId: failureCase.externalId });
    const events = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id));
    const runs = await db.select().from(agentRuns).where(inArray(agentRuns.correlationId, [correlationId, `${correlationId}:none`]));
    if (noImpact.outcome !== "not_required" || noImpact.notifications.length !== 0 || !events.some((event) => event.eventType === "final_stakeholder_notifications_queued") || !events.some((event) => event.eventType === "final_stakeholder_notifications_not_required") || runs.filter((run) => run.agentName === "FinalStakeholderNotificationAgent" && run.status === "completed").length !== 2) throw new Error("Final notification agent-run or workflow evidence validation failed.");
    console.log("Final stakeholder notification validation passed: RBAC recipients, local queued state, delivery/reroute/commitment evidence, no-impact handling, PostgreSQL persistence, and duplicate idempotency.");
  } finally {
    if (ids.failureCase) await db.delete(workflowEvents).where(eq(workflowEvents.failureCaseId, ids.failureCase));
    if (ids.failureCase) {
      const notices = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.failureCaseId, ids.failureCase));
      if (notices.length) await db.delete(notificationAttempts).where(inArray(notificationAttempts.notificationId, notices.map((notice) => notice.id)));
      await db.delete(notifications).where(eq(notifications.failureCaseId, ids.failureCase));
    }
    await db.delete(agentRuns).where(inArray(agentRuns.correlationId, [correlationId, `${correlationId}:none`]));
    if (ids.impact) await db.delete(shipmentImpacts).where(eq(shipmentImpacts.id, ids.impact));
    if (ids.commitment) await db.delete(shipmentCommitments).where(eq(shipmentCommitments.id, ids.commitment));
    if (ids.decision) await db.delete(rerouteDecisions).where(eq(rerouteDecisions.id, ids.decision));
    if (ids.job) await db.delete(productionJobs).where(eq(productionJobs.id, ids.job));
    if (ids.estimate) await db.delete(recoveryTimeEstimates).where(eq(recoveryTimeEstimates.id, ids.estimate));
    if (ids.workOrder) await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.id, ids.workOrder));
    if (ids.failureCase) await db.delete(failureCases).where(eq(failureCases.id, ids.failureCase));
    if (ids.part) await db.delete(parts).where(eq(parts.id, ids.part));
    if (ids.source) await db.delete(workstations).where(eq(workstations.id, ids.source));
    if (ids.target) await db.delete(workstations).where(eq(workstations.id, ids.target));
    if (ids.plant) await db.delete(plants).where(eq(plants.id, ids.plant));
    await queryClient.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
