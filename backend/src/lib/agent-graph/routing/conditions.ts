import { END } from "@langchain/langgraph";
import type { RecoveryGraphState } from "@/lib/agent-graph/state";

export function routeAfterFailurePrediction(state: RecoveryGraphState): "failure_alerting" | typeof END {
  return state.predictionId ? "failure_alerting" : END;
}

export function routeAfterRecoveryOrchestrator(state: RecoveryGraphState): "resource_recovery" | typeof END {
  return state.allocationLockId ? "resource_recovery" : END;
}

export function routeAfterResourceRecovery(state: RecoveryGraphState): "procurement_automation" | typeof END {
  return state.resourceRecoveryOutcome === "procurement_required" ? "procurement_automation" : END;
}
