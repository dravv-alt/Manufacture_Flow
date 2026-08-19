import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { applyRecoveryAllocationLock } from "@/lib/orchestration/service";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function recoveryOrchestratorNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.predictionId) return { workflowStatus: "REQUIRES_INTERVENTION" };
  const result = await applyRecoveryAllocationLock({ predictionId: state.predictionId, correlationId: state.correlationId });
  const patch: RecoveryGraphUpdate = {
    allocationLockId: result.allocationLock?.id ?? null,
    rerouteEvaluationJobIds: result.flaggedJobIds,
    workflowStatus: "REQUIRES_INTERVENTION",
  };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
