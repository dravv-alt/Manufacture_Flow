import { randomUUID } from "crypto";
import { END, START, StateGraph } from "@langchain/langgraph";
import { and, eq } from "drizzle-orm";
import { failureAlertingNode } from "@/lib/agent-graph/nodes/failure-alerting";
import { recoveryOrchestratorNode } from "@/lib/agent-graph/nodes/recovery-orchestrator";
import { failurePredictionNode } from "@/lib/agent-graph/nodes/failure-prediction";
import { RecoveryGraphInputNotFoundError, telemetryMonitorNode } from "@/lib/agent-graph/nodes/telemetry";
import { routeAfterFailurePrediction } from "@/lib/agent-graph/routing/conditions";
import { initialRecoveryGraphState, RecoveryGraphStateAnnotation, type RecoveryGraphState } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";

export const recoveryGraph = new StateGraph(RecoveryGraphStateAnnotation)
  .addNode("telemetry_monitor", telemetryMonitorNode)
  .addNode("failure_prediction", failurePredictionNode)
  .addNode("failure_alerting", failureAlertingNode)
  .addNode("recovery_orchestrator", recoveryOrchestratorNode)
  .addEdge(START, "telemetry_monitor")
  .addEdge("telemetry_monitor", "failure_prediction")
  .addConditionalEdges("failure_prediction", routeAfterFailurePrediction)
  .addEdge("failure_alerting", "recovery_orchestrator")
  .addEdge("recovery_orchestrator", END)
  .compile({ name: "manufacturing-recovery-graph" });

export class RecoveryGraphRunNotFoundError extends Error {}

export async function runRecoveryGraph(input: { telemetrySourceEventId: string; correlationId?: string }) {
  const correlationId = input.correlationId ?? `recovery:${input.telemetrySourceEventId}`;
  const initialState = initialRecoveryGraphState({ correlationId, graphRunId: randomUUID(), telemetrySourceEventId: input.telemetrySourceEventId });
  const [created] = await db.insert(recoveryGraphRuns).values({ id: initialState.graphRunId, correlationId, telemetrySourceEventId: input.telemetrySourceEventId, state: initialState }).onConflictDoNothing({ target: recoveryGraphRuns.correlationId }).returning();

  if (!created) {
    const [existing] = await db.select().from(recoveryGraphRuns).where(eq(recoveryGraphRuns.correlationId, correlationId)).limit(1);
    if (!existing) throw new RecoveryGraphRunNotFoundError(`Recovery graph run ${correlationId} was not found after idempotency lookup.`);
    return { idempotent: true, run: existing, state: existing.state };
  }

  try {
    const state = await recoveryGraph.invoke(initialState);
    const status = state.workflowStatus === "REQUIRES_INTERVENTION" ? "requires_intervention" : "completed";
    const [run] = await db.update(recoveryGraphRuns).set({ status, state, completedAt: new Date() }).where(eq(recoveryGraphRuns.id, created.id)).returning();
    return { idempotent: false, run, state };
  } catch (error) {
    const failedState = { ...initialState, workflowStatus: "FAILED", errors: [{ node: "recovery_graph", message: error instanceof Error ? error.message : "Recovery graph unavailable.", occurredAt: new Date().toISOString() }] };
    await db.update(recoveryGraphRuns).set({ status: "failed", state: failedState, error: error instanceof Error ? error.message : "Recovery graph unavailable.", completedAt: new Date() }).where(eq(recoveryGraphRuns.id, created.id));
    throw error;
  }
}

export async function getRecoveryGraphRun(correlationId: string) {
  const [run] = await db.select().from(recoveryGraphRuns).where(eq(recoveryGraphRuns.correlationId, correlationId)).limit(1);
  if (!run) throw new RecoveryGraphRunNotFoundError(`Recovery graph run ${correlationId} was not found.`);
  return run;
}

export { RecoveryGraphInputNotFoundError };
