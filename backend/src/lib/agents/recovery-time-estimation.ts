import { createHash } from "crypto";

export const RECOVERY_TIME_CALCULATION_VERSION = "recovery-time-v1";

export type RecoveryTimePlanningInputs = {
  calculationVersion: typeof RECOVERY_TIME_CALCULATION_VERSION;
  scenario: "local_spare" | "procurement";
  maintenanceWindowStart: string;
  maintenanceWindowEnd: string;
  repairDurationMinutes: number;
  validationMinutes: number;
  recoveryRecordedAt: string;
  procurement?: { requestedAt: string; vendorLeadTimeHours: number; receiptAndInspectionMinutes: number };
};

export function calculateRecoveryTime(inputs: RecoveryTimePlanningInputs) {
  const windowStart = new Date(inputs.maintenanceWindowStart);
  const windowEnd = new Date(inputs.maintenanceWindowEnd);
  const recoveryRecordedAt = new Date(inputs.recoveryRecordedAt);
  if ([windowStart, windowEnd, recoveryRecordedAt].some((date) => Number.isNaN(date.getTime())) || windowEnd <= windowStart || inputs.repairDurationMinutes <= 0) {
    throw new Error("Recovery-time planning inputs are invalid.");
  }

  let repairStart = windowStart;
  let durationAnchor = recoveryRecordedAt;
  if (inputs.scenario === "procurement") {
    if (!inputs.procurement || inputs.procurement.vendorLeadTimeHours <= 0) throw new Error("Procurement recovery requires a persisted vendor lead time.");
    const requestedAt = new Date(inputs.procurement.requestedAt);
    if (Number.isNaN(requestedAt.getTime())) throw new Error("Procurement request time is invalid.");
    const partReadyAt = new Date(requestedAt.getTime() + (inputs.procurement.vendorLeadTimeHours * 60 + inputs.procurement.receiptAndInspectionMinutes) * 60 * 1000);
    repairStart = new Date(Math.max(windowStart.getTime(), partReadyAt.getTime()));
    durationAnchor = requestedAt;
  }

  const expectedRecoveryAt = new Date(repairStart.getTime() + (inputs.repairDurationMinutes + inputs.validationMinutes) * 60 * 1000);
  return {
    expectedRecoveryAt,
    durationMinutes: Math.round((expectedRecoveryAt.getTime() - durationAnchor.getTime()) / 60_000),
    inputHash: createHash("sha256").update(JSON.stringify(inputs)).digest("hex"),
  };
}
