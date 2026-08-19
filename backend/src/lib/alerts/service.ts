import { and, eq } from "drizzle-orm";
import { createFailurePredictionAlerts } from "@/lib/agents/failure-prediction-alerting";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, notificationAttempts, notifications, parts, workstations, workflowEvents } from "@/lib/db/schema";

export class AlertingNotFoundError extends Error {}

export async function runFailurePredictionAlerting(predictionId: string) {
  const [prediction] = await db.select({
    id: failurePredictions.id,
    component: failurePredictions.component,
    probability: failurePredictions.probability,
    ttfHours: failurePredictions.ttfHours,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
    workstationCode: workstations.code,
    partCode: parts.code,
  }).from(failurePredictions)
    .innerJoin(failureCases, eq(failurePredictions.failureCaseId, failureCases.id))
    .innerJoin(workstations, eq(failurePredictions.workstationId, workstations.id))
    .innerJoin(parts, eq(failurePredictions.partId, parts.id))
    .where(eq(failurePredictions.id, predictionId))
    .limit(1);
  if (!prediction) throw new AlertingNotFoundError(`Failure prediction ${predictionId} was not found.`);

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "FailurePredictionAlertingAgent",
    status: "running",
    workstationId: undefined,
    sourceEventId: prediction.id,
    input: { failurePredictionId: prediction.id, failureCaseId: prediction.failureCaseExternalId },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const existingNotifications = await db.select().from(notifications).where(eq(notifications.failurePredictionId, prediction.id));
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "FailurePredictionAlertingAgent"), eq(agentRuns.sourceEventId, prediction.id))).limit(1);
    return { idempotent: true, notifications: existingNotifications, agentRun: agentRun ?? null };
  }

  try {
    const alerts = createFailurePredictionAlerts(prediction);
    const result = await db.transaction(async (tx) => {
      const createdNotifications = await tx.insert(notifications).values(alerts.map((alert) => ({
        failureCaseId: prediction.failureCaseId,
        failurePredictionId: prediction.id,
        recipientRole: alert.recipientRole,
        channel: "in_app",
        subject: alert.subject,
        state: "unread" as const,
        deliveredAt: new Date(),
      }))).returning();
      await tx.insert(notificationAttempts).values(createdNotifications.map((notification) => ({
        notificationId: notification.id,
        attemptNumber: 1,
        state: "unread" as const,
        channel: notification.channel,
        actor: "Failure Prediction Alerting Agent",
        detail: "Initial controlled in-app alert delivery recorded.",
      })));
      await tx.insert(workflowEvents).values({
        failureCaseId: prediction.failureCaseId,
        entityType: "failure_prediction",
        entityId: prediction.id,
        eventType: "failure_prediction_alerts_created",
        actor: "Failure Prediction Alerting Agent",
        payload: { failurePredictionId: prediction.id, notificationIds: createdNotifications.map((notification) => notification.id), recipients: createdNotifications.map((notification) => notification.recipientRole), channel: "in_app" },
      });
      return createdNotifications;
    });
    const output = { failurePredictionId: prediction.id, notificationIds: result.map((notification) => notification.id), recipients: result.map((notification) => notification.recipientRole), deliveryState: "unread" };
    await db.update(agentRuns).set({ status: "completed", output, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, notifications: result, agentRun: { id: createdRun.id, status: "completed" as const } };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Failure prediction alerting unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
