import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runFinalStakeholderNotifications } from "@/lib/final-stakeholder-notifications/service";

export async function finalStakeholderNotificationNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.failureCaseExternalId || !state.deliveryImpactOutcome) return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "final_stakeholder_notification", message: "Final stakeholder notification context is incomplete.", occurredAt: new Date().toISOString() }] };
  const result = await runFinalStakeholderNotifications({ deliveryImpactIds: state.deliveryImpactIds, rerouteDecisionIds: state.rerouteDecisionIds, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId });
  const patch: RecoveryGraphUpdate = { finalNotificationIds: result.notifications.map((notification) => notification.id), finalNotificationOutcome: result.outcome, workflowStatus: "AWAITING_MAINTENANCE_EXECUTION" };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
