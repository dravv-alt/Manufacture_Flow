export type MaintenancePlanningSource = "local_spare" | "procurement";

export function createMaintenancePlan(input: { component: string; partCode: string; source: MaintenancePlanningSource; anchorTime: Date }) {
  const offsetHours = input.source === "local_spare" ? 2 : 24;
  const plannedWindowStart = new Date(input.anchorTime.getTime() + offsetHours * 60 * 60 * 1000);
  const plannedWindowEnd = new Date(plannedWindowStart.getTime() + 2 * 60 * 60 * 1000);
  return {
    priority: "critical" as const,
    plannedWindowStart,
    plannedWindowEnd,
    diagnosis: `Predicted failure: ${input.component}. Required part: ${input.partCode}.`,
    checklist: [
      "Confirm controlled shutdown and lockout-tagout before maintenance work.",
      `Verify diagnosis for ${input.component}.`,
      input.source === "local_spare" ? `Verify active reservation and issue ${input.partCode} from inventory.` : `Verify procurement receipt and inspect ${input.partCode} before issue.`,
      `Replace ${input.partCode} and record installation torque/calibration values.`,
      "Run supervised functional test; maintenance lead must approve return-to-service decision.",
    ],
  };
}
