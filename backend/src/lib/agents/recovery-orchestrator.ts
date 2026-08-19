export type AllocationPolicyInput = {
  severity: "critical" | "warning";
  probability: number;
  ttfHours: number;
};

export type AllocationPolicyDecision = {
  workstationStatus: "AT_RISK" | "CONTROLLED_SHUTDOWN_PENDING";
  shouldLockAllocation: boolean;
  reason: string;
};

/**
 * Controlled safety policy. It is intentionally deterministic until a governed
 * decision-policy provider is introduced in a later phase.
 */
export function evaluateAllocationPolicy(input: AllocationPolicyInput): AllocationPolicyDecision {
  const requiresControlledShutdown = input.severity === "critical" && input.probability >= 85 && input.ttfHours <= 24;
  if (requiresControlledShutdown) {
    return {
      workstationStatus: "CONTROLLED_SHUTDOWN_PENDING",
      shouldLockAllocation: true,
      reason: `Critical prediction ${input.probability}% with ${input.ttfHours}h TTF meets controlled-shutdown policy.`,
    };
  }
  return {
    workstationStatus: "AT_RISK",
    shouldLockAllocation: false,
    reason: `Prediction ${input.probability}% with ${input.ttfHours}h TTF remains under at-risk monitoring policy.`,
  };
}
