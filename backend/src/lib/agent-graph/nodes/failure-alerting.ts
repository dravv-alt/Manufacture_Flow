import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { runFailurePredictionAlerting } from "@/lib/alerts/service";
import { db } from "@/lib/db/client";
import { agentRuns, recoveryGraphRuns } from "@/lib/db/schema";

async function persist(state: RecoveryGraphState, patch: RecoveryGraphUpdate) {
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
}

export async function failureAlertingNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.predictionId) return { workflowStatus: "REQUIRES_INTERVENTION" };
  const result = await runFailurePredictionAlerting(state.predictionId);
  if (result.agentRun?.id) await db.update(agentRuns).set({ correlationId: state.correlationId }).where(eq(agentRuns.id, result.agentRun.id));
  const patch: RecoveryGraphUpdate = { alertNotificationIds: result.notifications.map((notification) => notification.id), workflowStatus: "REQUIRES_INTERVENTION" };
  await persist(state, patch);
  return patch;
}
