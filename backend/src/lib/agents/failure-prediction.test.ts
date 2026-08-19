import { describe, expect, it } from "vitest";
import { createControlledFailurePrediction } from "./failure-prediction";

describe("FailurePredictionAgent controlled provider", () => {
  it("uses the canonical WS-102 bearing prediction for a critical anomaly", () => {
    expect(createControlledFailurePrediction({ workstationCode: "WS-102", anomalySeverity: "critical", anomalyReasons: ["High vibration"] })).toMatchObject({
      component: "X-Axis Servo Motor Bearing",
      partCode: "BRG-10023",
      probability: 92,
      ttfHours: 18,
      severity: "critical",
    });
  });

  it("produces an earlier warning prediction before the critical state", () => {
    expect(createControlledFailurePrediction({ workstationCode: "WS-102", anomalySeverity: "warning", anomalyReasons: ["Temperature warning"] })).toMatchObject({ probability: 78, ttfHours: 48, severity: "warning" });
  });

  it("suppresses nominal and unmapped workstation observations", () => {
    expect(createControlledFailurePrediction({ workstationCode: "WS-102", anomalySeverity: "none", anomalyReasons: [] })).toBeNull();
    expect(createControlledFailurePrediction({ workstationCode: "WS-105", anomalySeverity: "critical", anomalyReasons: ["Error code"] })).toBeNull();
  });
});
