import { END } from "@langchain/langgraph";
import type { RecoveryGraphState } from "@/lib/agent-graph/state";

export function routeAfterFailurePrediction(state: RecoveryGraphState): "failure_alerting" | typeof END {
  return state.predictionId ? "failure_alerting" : END;
}
