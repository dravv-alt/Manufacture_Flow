import { END } from "@langchain/langgraph";
import type { RecoveryGraphState } from "@/lib/agent-graph/state";

export function routeAfterFailurePrediction(state: RecoveryGraphState): "failure_alerting" | typeof END {
  return state.predictionId ? "failure_alerting" : END;
}

export function routeAfterRecoveryOrchestrator(state: RecoveryGraphState): "resource_recovery" | typeof END {
  return state.allocationLockId ? "resource_recovery" : END;
}

export function routeAfterResourceRecovery(state: RecoveryGraphState): "procurement_automation" | "maintenance_work_order" | typeof END {
  if (state.resourceRecoveryOutcome === "procurement_required") return "procurement_automation";
  return state.resourceRecoveryOutcome === "reserved" ? "maintenance_work_order" : END;
}

export function routeAfterProcurementAutomation(state: RecoveryGraphState): "maintenance_work_order" | typeof END {
  return state.procurementAutomationOutcome === "requisition_created" ? "maintenance_work_order" : END;
}
