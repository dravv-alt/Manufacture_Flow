import { describe, expect, it } from "vitest";
import { assessTelemetry } from "./telemetry-monitor";

const nominal = { temperatureCelsius: 52, vibrationMmPerSecond: 1.1, pressureBar: 5.2, cycleCount: 1200, motorCurrentAmps: 12, activeErrorCodes: [] };

describe("TelemetryMonitorAgent", () => {
  it("records nominal observations without an anomaly", () => {
    expect(assessTelemetry(nominal)).toEqual({ severity: "none", reasons: [], policyVersion: "controlled-v1" });
  });

  it("marks controlled warning-threshold observations as warnings", () => {
    const result = assessTelemetry({ ...nominal, temperatureCelsius: 71 });
    expect(result.severity).toBe("warning");
    expect(result.reasons[0]).toContain("Temperature 71°C");
  });

  it("marks critical signal or machine error observations as critical", () => {
    expect(assessTelemetry({ ...nominal, vibrationMmPerSecond: 3.2 }).severity).toBe("critical");
    expect(assessTelemetry({ ...nominal, activeErrorCodes: ["E-STOP-17"] }).severity).toBe("critical");
  });
});
