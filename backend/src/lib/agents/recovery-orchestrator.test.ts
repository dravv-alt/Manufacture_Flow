import { describe, expect, it } from "vitest";
import { evaluateAllocationPolicy } from "./recovery-orchestrator";

describe("RecoveryOrchestrator allocation policy", () => {
  it("locks the canonical high-risk WS-102 prediction for controlled shutdown", () => {
    expect(evaluateAllocationPolicy({ severity: "critical", probability: 92, ttfHours: 18 })).toMatchObject({
      workstationStatus: "CONTROLLED_SHUTDOWN_PENDING",
      shouldLockAllocation: true,
    });
  });

  it("keeps lower-risk predictions at risk without an allocation lock", () => {
    expect(evaluateAllocationPolicy({ severity: "warning", probability: 78, ttfHours: 48 })).toMatchObject({
      workstationStatus: "AT_RISK",
      shouldLockAllocation: false,
    });
  });
});
