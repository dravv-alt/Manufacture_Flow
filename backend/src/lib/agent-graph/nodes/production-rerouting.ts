import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runProductionRerouting } from "@/lib/production-rerouting/service";

export async function productionReroutingNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.recoveryTimeEstimateId || !state.failureCaseExternalId) return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "production_rerouting", message: "Production rerouting context is incomplete.", occurredAt: new Date().toISOString() }] };
  const result = await runProductionRerouting({ recoveryTimeEstimateId: state.recoveryTimeEstimateId, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId });
  const patch: RecoveryGraphUpdate = { rerouteDecisionIds: result.decisions.map((decision) => decision.id), reroutingOutcome: result.decisions.some((decision) => decision.outcome === "no_feasible_candidate") ? "requires_intervention" : "rerouted", workflowStatus: result.decisions.some((decision) => decision.outcome === "no_feasible_candidate") ? "REQUIRES_INTERVENTION" : "RECOVERY_RUNNING" };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
