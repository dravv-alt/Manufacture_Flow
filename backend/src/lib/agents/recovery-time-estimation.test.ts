import { describe, expect, it } from "vitest";
import { RECOVERY_TIME_CALCULATION_VERSION, calculateRecoveryTime } from "./recovery-time-estimation";

const base = {
  calculationVersion: RECOVERY_TIME_CALCULATION_VERSION,
  maintenanceWindowStart: "2026-08-20T02:00:00.000Z",
  maintenanceWindowEnd: "2026-08-20T04:00:00.000Z",
  repairDurationMinutes: 120,
  validationMinutes: 60,
  recoveryRecordedAt: "2026-08-20T00:00:00.000Z",
} as const;

describe("RecoveryTimeEstimationAgent calculation", () => {
  it("calculates a deterministic local-spare restoration time", () => {
    const result = calculateRecoveryTime({ ...base, scenario: "local_spare" });
    expect(result.expectedRecoveryAt.toISOString()).toBe("2026-08-20T05:00:00.000Z");
    expect(result.durationMinutes).toBe(300);
  });

  it("waits for the persisted procurement lead time before repair", () => {
    const result = calculateRecoveryTime({ ...base, scenario: "procurement", procurement: { requestedAt: "2026-08-20T00:00:00.000Z", vendorLeadTimeHours: 8, receiptAndInspectionMinutes: 60 } });
    expect(result.expectedRecoveryAt.toISOString()).toBe("2026-08-20T12:00:00.000Z");
    expect(result.durationMinutes).toBe(720);
  });

  it("changes the calculation fingerprint when a material lead-time input changes", () => {
    const first = calculateRecoveryTime({ ...base, scenario: "procurement", procurement: { requestedAt: "2026-08-20T00:00:00.000Z", vendorLeadTimeHours: 8, receiptAndInspectionMinutes: 60 } });
    const revised = calculateRecoveryTime({ ...base, scenario: "procurement", procurement: { requestedAt: "2026-08-20T00:00:00.000Z", vendorLeadTimeHours: 12, receiptAndInspectionMinutes: 60 } });
    expect(revised.inputHash).not.toBe(first.inputHash);
    expect(revised.expectedRecoveryAt > first.expectedRecoveryAt).toBe(true);
  });
});
