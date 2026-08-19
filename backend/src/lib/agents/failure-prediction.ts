export type ControlledPredictionInput = {
  workstationCode: string;
  anomalySeverity: "none" | "warning" | "critical";
  anomalyReasons: string[];
};

export type ControlledFailurePrediction = {
  component: string;
  partCode: string;
  severity: "warning" | "critical";
  probability: number;
  ttfHours: number;
  providerName: "ControlledFailurePredictionProvider";
  providerVersion: "controlled-v1";
  rationale: string[];
};

const controlledMappings = {
  "WS-102": {
    component: "X-Axis Servo Motor Bearing",
    partCode: "BRG-10023",
    warning: { probability: 78, ttfHours: 48 },
    critical: { probability: 92, ttfHours: 18 },
  },
  "WS-108": {
    component: "Joint B Actuator",
    partCode: "ACT-2218",
    warning: { probability: 70, ttfHours: 72 },
    critical: { probability: 88, ttfHours: 24 },
  },
} as const;

/**
 * Controlled deterministic provider. It is intentionally isolated behind this
 * function so a trained model can replace it later without changing services,
 * audits, or downstream workflow contracts.
 */
export function createControlledFailurePrediction(input: ControlledPredictionInput): ControlledFailurePrediction | null {
  if (input.anomalySeverity === "none") return null;
  const mapping = controlledMappings[input.workstationCode as keyof typeof controlledMappings];
  if (!mapping) return null;
  const estimate = input.anomalySeverity === "critical" ? mapping.critical : mapping.warning;
  return {
    component: mapping.component,
    partCode: mapping.partCode,
    severity: input.anomalySeverity,
    probability: estimate.probability,
    ttfHours: estimate.ttfHours,
    providerName: "ControlledFailurePredictionProvider",
    providerVersion: "controlled-v1",
    rationale: [...input.anomalyReasons, `Controlled workstation/component mapping selected ${mapping.partCode}.`],
  };
}
