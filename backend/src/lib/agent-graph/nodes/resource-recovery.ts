import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runResourceRecovery } from "@/lib/resource-recovery/service";

export async function resourceRecoveryNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.predictionId || !state.failureCaseExternalId || !state.failureComponent || !state.requiredPartCode) {
    return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "resource_recovery", message: "Persisted failure context is incomplete for inventory recovery.", occurredAt: new Date().toISOString() }] };
  }
  const response = await runResourceRecovery({ predictionId: state.predictionId, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId, component: state.failureComponent, requiredPartCode: state.requiredPartCode });
  const patch: RecoveryGraphUpdate = {
    resourceRecoveryResultId: response.result.id,
    inventoryReservationId: response.result.inventoryReservationId,
    resourceRecoveryOutcome: response.result.outcome,
    workflowStatus: "REQUIRES_INTERVENTION",
  };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
