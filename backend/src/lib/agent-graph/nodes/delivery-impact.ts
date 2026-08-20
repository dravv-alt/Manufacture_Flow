import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runDeliveryImpact } from "@/lib/delivery-impact/service";

export async function deliveryImpactNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.recoveryTimeEstimateId || !state.failureCaseExternalId) return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "delivery_impact", message: "Delivery-impact context is incomplete.", occurredAt: new Date().toISOString() }] };
  const result = await runDeliveryImpact({ recoveryTimeEstimateId: state.recoveryTimeEstimateId, rerouteDecisionIds: state.rerouteDecisionIds, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId });
  const patch: RecoveryGraphUpdate = { deliveryImpactIds: result.impacts.map((impact) => impact.id), deliveryImpactOutcome: result.noLinkedShipment ? "no_linked_shipment" : "calculated", workflowStatus: "COMPLETED" };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
