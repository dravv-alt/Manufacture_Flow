import { createHash } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createFinalStakeholderNotificationDrafts } from "@/lib/agents/final-stakeholder-notification";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, notificationAttempts, notifications, productionJobs, rerouteDecisions, shipmentCommitments, shipmentImpacts, workstations, workflowEvents } from "@/lib/db/schema";

export class FinalStakeholderNotificationNotFoundError extends Error {}

type NotificationEvidence = {
  queueState: "queued_local";
  correlationId: string;
  failureCaseExternalId: string;
  deliveryImpactSummary: { highestClassification: "ON_TIME" | "AT_RISK" | "DELAYED"; commitmentCount: number; totalDelayMinutes: number };
  commitments: Array<{ shipmentCommitmentId: string; externalId: string; classification: string; originalCommittedAt: string; revisedProjectedAt: string; delayMinutes: number }>;
  reroutes: Array<{ rerouteDecisionId: string; productionJobId: string; productionJobExternalId: string | null; targetWorkstationId: string | null; targetWorkstationCode: string | null; outcome: string }>;
  requestedAction: string;
};

function sourceEventId(correlationId: string, deliveryImpactIds: string[]) {
  const identity = `${correlationId}:${[...deliveryImpactIds].sort().join(",")}`;
  return `final-stakeholder:${createHash("sha256").update(identity).digest("hex")}`;
}

function notificationIdsFromOutput(output: Record<string, unknown> | null) {
  return Array.isArray(output?.notificationIds) ? output.notificationIds.filter((id): id is string => typeof id === "string") : [];
}

export async function runFinalStakeholderNotifications(input: { deliveryImpactIds: string[]; rerouteDecisionIds: string[]; correlationId: string; failureCaseExternalId: string }) {
  const [failureCase] = await db.select().from(failureCases).where(eq(failureCases.externalId, input.failureCaseExternalId)).limit(1);
  if (!failureCase) throw new FinalStakeholderNotificationNotFoundError(`Failure case ${input.failureCaseExternalId} was not found.`);

  const uniqueImpactIds = [...new Set(input.deliveryImpactIds)];
  const impacts = uniqueImpactIds.length === 0 ? [] : await db.select().from(shipmentImpacts).where(inArray(shipmentImpacts.id, uniqueImpactIds));
  if (impacts.length !== uniqueImpactIds.length || impacts.some((impact) => impact.failureCaseId !== failureCase.id || impact.correlationId !== input.correlationId)) {
    throw new FinalStakeholderNotificationNotFoundError("Delivery impacts do not match the persisted final-notification context.");
  }

  const eventId = sourceEventId(input.correlationId, uniqueImpactIds);
  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "FinalStakeholderNotificationAgent",
    status: "running",
    workstationId: failureCase.workstationId,
    correlationId: input.correlationId,
    sourceEventId: eventId,
    input,
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "FinalStakeholderNotificationAgent"), eq(agentRuns.sourceEventId, eventId))).limit(1);
    const ids = notificationIdsFromOutput(agentRun?.output ?? null);
    const existingNotifications = ids.length === 0 ? [] : await db.select().from(notifications).where(inArray(notifications.id, ids));
    return { idempotent: true, agentRun: agentRun ?? null, notifications: existingNotifications, outcome: ids.length === 0 ? "not_required" as const : "queued" as const };
  }

  try {
    const result = await db.transaction(async (tx) => {
      if (impacts.length === 0) {
        await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "final_stakeholder_notification", entityId: createdRun.id, eventType: "final_stakeholder_notifications_not_required", actor: "Final Stakeholder Notification Agent", payload: { correlationId: input.correlationId, deliveryImpactIds: [] } });
        return { notifications: [], outcome: "not_required" as const };
      }

      const commitmentIds = impacts.map((impact) => impact.shipmentCommitmentId).filter((id): id is string => Boolean(id));
      const commitments = commitmentIds.length === 0 ? [] : await tx.select().from(shipmentCommitments).where(inArray(shipmentCommitments.id, commitmentIds));
      const commitmentById = new Map(commitments.map((commitment) => [commitment.id, commitment]));
      if (commitments.length !== new Set(commitmentIds).size) throw new FinalStakeholderNotificationNotFoundError("A delivery impact is missing its persisted shipment commitment.");

      const linkedDecisionIds = [...new Set([...input.rerouteDecisionIds, ...impacts.flatMap((impact) => impact.rerouteDecisionIds ?? [])])];
      const decisions = linkedDecisionIds.length === 0 ? [] : await tx.select().from(rerouteDecisions).where(and(eq(rerouteDecisions.correlationId, input.correlationId), inArray(rerouteDecisions.id, linkedDecisionIds)));
      const executedDecisions = decisions.filter((decision) => decision.outcome === "rerouted");
      const jobs = executedDecisions.length === 0 ? [] : await tx.select().from(productionJobs).where(inArray(productionJobs.id, executedDecisions.map((decision) => decision.productionJobId)));
      const targetIds = executedDecisions.map((decision) => decision.targetWorkstationId).filter((id): id is string => Boolean(id));
      const targets = targetIds.length === 0 ? [] : await tx.select().from(workstations).where(inArray(workstations.id, targetIds));
      const jobById = new Map(jobs.map((job) => [job.id, job]));
      const targetById = new Map(targets.map((target) => [target.id, target]));
      const classifications = impacts.map((impact) => impact.classification).filter((classification): classification is "ON_TIME" | "AT_RISK" | "DELAYED" => Boolean(classification));
      const drafts = createFinalStakeholderNotificationDrafts({ failureCaseExternalId: failureCase.externalId, classifications, commitmentCount: impacts.length });
      const [prediction] = await tx.select({ id: failurePredictions.id }).from(failurePredictions).where(eq(failurePredictions.failureCaseId, failureCase.id)).orderBy(desc(failurePredictions.createdAt)).limit(1);
      const highestClassification: NotificationEvidence["deliveryImpactSummary"]["highestClassification"] = classifications.includes("DELAYED") ? "DELAYED" : classifications.includes("AT_RISK") ? "AT_RISK" : "ON_TIME";
      const commonEvidence = {
        queueState: "queued_local" as const,
        correlationId: input.correlationId,
        failureCaseExternalId: failureCase.externalId,
        deliveryImpactSummary: { highestClassification, commitmentCount: impacts.length, totalDelayMinutes: impacts.reduce((total, impact) => total + (impact.delayMinutes ?? 0), 0) },
        commitments: impacts.map((impact) => {
          const commitment = impact.shipmentCommitmentId ? commitmentById.get(impact.shipmentCommitmentId) : undefined;
          if (!commitment) throw new FinalStakeholderNotificationNotFoundError("A delivery impact is missing its persisted shipment commitment.");
          return { shipmentCommitmentId: commitment.id, externalId: commitment.externalId, classification: impact.classification ?? "ON_TIME", originalCommittedAt: (impact.originalCommittedAt ?? impact.originalEta).toISOString(), revisedProjectedAt: (impact.revisedProjectedAt ?? impact.revisedEta).toISOString(), delayMinutes: impact.delayMinutes ?? impact.deltaHours * 60 };
        }),
        reroutes: executedDecisions.map((decision) => ({ rerouteDecisionId: decision.id, productionJobId: decision.productionJobId, productionJobExternalId: jobById.get(decision.productionJobId)?.externalId ?? null, targetWorkstationId: decision.targetWorkstationId, targetWorkstationCode: decision.targetWorkstationId ? targetById.get(decision.targetWorkstationId)?.code ?? null : null, outcome: decision.outcome })),
      };
      const createdNotifications = [] as Array<typeof notifications.$inferSelect>;
      for (const draft of drafts) {
        const [notification] = await tx.insert(notifications).values({ failureCaseId: failureCase.id, failurePredictionId: prediction?.id, recipientRole: draft.recipientRole, channel: "local_queue", subject: draft.subject, state: "unread" }).returning();
        const evidence: NotificationEvidence = { ...commonEvidence, requestedAction: draft.requestedAction };
        await tx.insert(notificationAttempts).values({ notificationId: notification.id, attemptNumber: 1, state: "unread", channel: notification.channel, actor: "Final Stakeholder Notification Agent", detail: JSON.stringify(evidence) });
        createdNotifications.push(notification);
      }
      await tx.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "final_stakeholder_notification", entityId: createdRun.id, eventType: "final_stakeholder_notifications_queued", actor: "Final Stakeholder Notification Agent", payload: { correlationId: input.correlationId, deliveryImpactIds: impacts.map((impact) => impact.id), rerouteDecisionIds: executedDecisions.map((decision) => decision.id), notificationIds: createdNotifications.map((notification) => notification.id), recipients: createdNotifications.map((notification) => notification.recipientRole), channel: "local_queue", queueState: "queued_local", deliveryImpactSummary: commonEvidence.deliveryImpactSummary } });
      return { notifications: createdNotifications, outcome: "queued" as const };
    });
    await db.update(agentRuns).set({ status: "completed", output: { notificationIds: result.notifications.map((notification) => notification.id), recipients: result.notifications.map((notification) => notification.recipientRole), outcome: result.outcome, channel: "local_queue" }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, ...result };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Final stakeholder notification unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
