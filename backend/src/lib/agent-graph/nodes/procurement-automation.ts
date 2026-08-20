import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runProcurementAutomation } from "@/lib/procurement-automation/service";

export async function procurementAutomationNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.resourceRecoveryResultId || !state.failureCaseExternalId || !state.requiredPartCode) {
    return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "procurement_automation", message: "Procurement-required recovery context is incomplete.", occurredAt: new Date().toISOString() }] };
  }
  const response = await runProcurementAutomation({ resourceRecoveryResultId: state.resourceRecoveryResultId, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId, requiredPartCode: state.requiredPartCode });
  const patch: RecoveryGraphUpdate = {
    procurementAutomationResultId: response.result.id,
    procurementRequestId: response.result.procurementRequestId,
    vendorNotificationId: response.vendorNotification?.id ?? null,
    procurementAutomationOutcome: response.result.outcome,
    workflowStatus: "REQUIRES_INTERVENTION",
  };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
