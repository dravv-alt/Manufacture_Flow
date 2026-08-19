import { and, eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, recoveryGraphRuns } from "@/lib/db/schema";
import { runFailurePrediction } from "@/lib/predictions/service";

async function persist(state: RecoveryGraphState, patch: RecoveryGraphUpdate) {
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
}

export async function failurePredictionNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  const result = await runFailurePrediction(state.telemetrySourceEventId);
  if (result.agentRun?.id) await db.update(agentRuns).set({ correlationId: state.correlationId }).where(eq(agentRuns.id, result.agentRun.id));

  if (!result.prediction) {
    const patch: RecoveryGraphUpdate = {
      workflowStatus: state.telemetrySeverity === "none" ? "MONITORING" : "REQUIRES_INTERVENTION",
      errors: state.telemetrySeverity === "none" ? [] : [{ node: "failure_prediction", message: "No prediction was produced for an anomalous telemetry event.", occurredAt: new Date().toISOString() }],
    };
    await persist(state, patch);
    return patch;
  }

  const [failureCase] = await db.select({ externalId: failureCases.externalId }).from(failureCases)
    .innerJoin(failurePredictions, eq(failurePredictions.failureCaseId, failureCases.id))
    .where(eq(failurePredictions.id, result.prediction.id)).limit(1);
  const patch: RecoveryGraphUpdate = { predictionId: result.prediction.id, failureCaseExternalId: failureCase?.externalId ?? null, workflowStatus: "FAILURE_PREDICTED" };
  await persist(state, patch);
  return patch;
}
