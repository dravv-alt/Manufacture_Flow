import { and, desc, eq } from "drizzle-orm";
import { createControlledFailurePrediction } from "@/lib/agents/failure-prediction";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, parts, telemetryReadings, workflowEvents, workstations } from "@/lib/db/schema";

export class PredictionNotFoundError extends Error {}

export async function runFailurePrediction(sourceEventId: string) {
  const [reading] = await db.select().from(telemetryReadings).where(eq(telemetryReadings.sourceEventId, sourceEventId)).limit(1);
  if (!reading) throw new PredictionNotFoundError(`Telemetry source event ${sourceEventId} was not found.`);

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "FailurePredictionAgent",
    status: "running",
    workstationId: reading.workstationId,
    sourceEventId,
    input: { telemetryReadingId: reading.id, anomalySeverity: reading.anomalySeverity, anomalyReasons: reading.anomalyReasons },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [prediction] = await db.select().from(failurePredictions).where(eq(failurePredictions.telemetryReadingId, reading.id)).limit(1);
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "FailurePredictionAgent"), eq(agentRuns.sourceEventId, sourceEventId))).limit(1);
    return { idempotent: true, prediction: prediction ?? null, agentRun: agentRun ?? null };
  }

  try {
    const [workstation] = await db.select().from(workstations).where(eq(workstations.id, reading.workstationId)).limit(1);
    if (!workstation) throw new PredictionNotFoundError(`Workstation for telemetry source event ${sourceEventId} was not found.`);
    const decision = createControlledFailurePrediction({ workstationCode: workstation.code, anomalySeverity: reading.anomalySeverity, anomalyReasons: reading.anomalyReasons });

    if (!decision) {
      const output = { disposition: "suppressed", reason: "No controlled component mapping or no anomaly severity for this telemetry reading." };
      await db.update(agentRuns).set({ status: "completed", output, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
      return { idempotent: false, prediction: null, agentRun: { id: createdRun.id, status: "completed" as const }, output };
    }

    const [part] = await db.select().from(parts).where(eq(parts.code, decision.partCode)).limit(1);
    if (!part) throw new PredictionNotFoundError(`Mapped part ${decision.partCode} was not found.`);

    const result = await db.transaction(async (tx) => {
      const [existingCase] = await tx.select().from(failureCases).where(and(eq(failureCases.workstationId, workstation.id), eq(failureCases.partId, part.id))).orderBy(desc(failureCases.detectedAt)).limit(1);
      const [failureCase] = existingCase ? [existingCase] : await tx.insert(failureCases).values({
        externalId: `FC-AUTO-${reading.id.slice(0, 8).toUpperCase()}`,
        workstationId: workstation.id,
        partId: part.id,
        severity: decision.severity,
        component: decision.component,
        probability: decision.probability,
        ttfHours: decision.ttfHours,
        detectedAt: reading.observedAt,
        workflowState: "Prediction recorded / awaiting alerting",
        ownerRole: "Production Supervisor",
      }).returning();

      const [prediction] = await tx.insert(failurePredictions).values({
        telemetryReadingId: reading.id,
        failureCaseId: failureCase.id,
        workstationId: workstation.id,
        partId: part.id,
        component: decision.component,
        severity: decision.severity,
        probability: decision.probability,
        ttfHours: decision.ttfHours,
        providerName: decision.providerName,
        providerVersion: decision.providerVersion,
        rationale: decision.rationale,
      }).returning();

      await tx.insert(workflowEvents).values({
        failureCaseId: failureCase.id,
        entityType: "failure_prediction",
        entityId: prediction.id,
        eventType: "failure_prediction_created",
        actor: "Failure Prediction Agent",
        payload: { telemetryReadingId: reading.id, provider: decision.providerName, providerVersion: decision.providerVersion, probability: decision.probability, ttfHours: decision.ttfHours, partCode: decision.partCode, linkedExistingCase: Boolean(existingCase) },
      });
      return { prediction, failureCase, linkedExistingCase: Boolean(existingCase) };
    });

    const output = { predictionId: result.prediction.id, failureCaseId: result.failureCase.externalId, probability: decision.probability, ttfHours: decision.ttfHours, linkedExistingCase: result.linkedExistingCase };
    await db.update(agentRuns).set({ status: "completed", output, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, ...result, agentRun: { id: createdRun.id, status: "completed" as const } };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Failure prediction unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
