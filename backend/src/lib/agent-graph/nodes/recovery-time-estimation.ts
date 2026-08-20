import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runRecoveryTimeEstimation } from "@/lib/recovery-time-estimation/service";

export async function recoveryTimeEstimationNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.maintenanceWorkOrderId || !state.failureCaseExternalId) {
    return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "recovery_time_estimation", message: "Recovery-time estimation context is incomplete.", occurredAt: new Date().toISOString() }] };
  }
  const response = await runRecoveryTimeEstimation({ maintenanceWorkOrderId: state.maintenanceWorkOrderId, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId });
  const patch: RecoveryGraphUpdate = { recoveryTimeEstimateId: response.estimate.id, workflowStatus: "REQUIRES_INTERVENTION" };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
