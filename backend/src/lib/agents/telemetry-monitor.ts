export type TelemetryObservation = {
  temperatureCelsius: number;
  vibrationMmPerSecond: number;
  pressureBar: number;
  cycleCount: number;
  motorCurrentAmps: number;
  activeErrorCodes: string[];
};

export type TelemetryAnomalySeverity = "none" | "warning" | "critical";

export type TelemetryAssessment = {
  severity: TelemetryAnomalySeverity;
  reasons: string[];
  policyVersion: "controlled-v1";
};

/**
 * Controlled, deterministic monitoring policy. This is intentionally not
 * represented as an ML failure prediction: it only classifies the observed
 * signal and leaves failure-case creation to the next agent slice.
 */
const thresholds = {
  temperatureCelsius: { warning: 70, critical: 75 },
  vibrationMmPerSecond: { warning: 2.5, critical: 3 },
  motorCurrentAmps: { warning: 18, critical: 20 },
  pressureBar: { minimum: 2.5, maximum: 8.5 },
} as const;

export function assessTelemetry(observation: TelemetryObservation): TelemetryAssessment {
  const warningReasons: string[] = [];
  const criticalReasons: string[] = [];

  if (observation.temperatureCelsius >= thresholds.temperatureCelsius.critical) criticalReasons.push(`Temperature ${observation.temperatureCelsius}°C exceeds controlled critical threshold.`);
  else if (observation.temperatureCelsius >= thresholds.temperatureCelsius.warning) warningReasons.push(`Temperature ${observation.temperatureCelsius}°C exceeds controlled warning threshold.`);

  if (observation.vibrationMmPerSecond >= thresholds.vibrationMmPerSecond.critical) criticalReasons.push(`Vibration ${observation.vibrationMmPerSecond} mm/s exceeds controlled critical threshold.`);
  else if (observation.vibrationMmPerSecond >= thresholds.vibrationMmPerSecond.warning) warningReasons.push(`Vibration ${observation.vibrationMmPerSecond} mm/s exceeds controlled warning threshold.`);

  if (observation.motorCurrentAmps >= thresholds.motorCurrentAmps.critical) criticalReasons.push(`Motor current ${observation.motorCurrentAmps} A exceeds controlled critical threshold.`);
  else if (observation.motorCurrentAmps >= thresholds.motorCurrentAmps.warning) warningReasons.push(`Motor current ${observation.motorCurrentAmps} A exceeds controlled warning threshold.`);

  if (observation.pressureBar < thresholds.pressureBar.minimum || observation.pressureBar > thresholds.pressureBar.maximum) warningReasons.push(`Pressure ${observation.pressureBar} bar is outside the controlled operating range.`);
  if (observation.activeErrorCodes.length > 0) criticalReasons.push(`Active machine error codes reported: ${observation.activeErrorCodes.join(", ")}.`);

  return {
    severity: criticalReasons.length > 0 ? "critical" : warningReasons.length > 0 ? "warning" : "none",
    reasons: [...criticalReasons, ...warningReasons],
    policyVersion: "controlled-v1",
  };
}
