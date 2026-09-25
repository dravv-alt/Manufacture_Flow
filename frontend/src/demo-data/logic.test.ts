// demo_data
import { describe, expect, it } from "vitest";
import { calculateDemoRisk, deriveDemoWorkstation, riskToTtfHours, validateDemoScenario } from "./logic";

describe("controlled demo logic", () => {
  it("derives a critical signal from telemetry instead of accepting an arbitrary risk", () => {
    const station = deriveDemoWorkstation({ id: "WS-1", status: "Operational" as const, capacity: 45, temperature: 84.5, vibration: 4.1, motorCurrent: 18.4, errorLogsCount: 3, predictedComponent: "Bearing", activeCaseId: "FC-1" });
    expect(station.failureProb).toBe(calculateDemoRisk(station));
    expect(station.health).toBe("Critical");
    expect(station.status).toBe("At Risk");
    expect(riskToTtfHours(station.failureProb, station.status)).not.toBeNull();
  });

  it("marks unavailable capacity as a maintenance/down risk without inventing remaining life", () => {
    const station = deriveDemoWorkstation({ id: "WS-2", status: "Under Maintenance" as const, capacity: 0, temperature: 25, vibration: 0, motorCurrent: 0, errorLogsCount: 2, predictedComponent: "Lens", activeCaseId: "FC-2" });
    expect(station.failureProb).toBe(100);
    expect(station.estimatedTTF).toBe("0 Hours");
  });

  it("reports broken cross-references instead of silently accepting them", () => {
    const station = deriveDemoWorkstation({ id: "WS-3", status: "Operational" as const, capacity: 75, temperature: 45, vibration: 1.4, motorCurrent: 11, errorLogsCount: 0, predictedComponent: "—" });
    expect(validateDemoScenario({ workstations: [station], failures: [], jobs: [{ id: "J-1", original: "WS-3", target: "MISSING", impact: "+0h" }], alternatives: [], calendar: [] })).toContain("J-1 has no eligible reroute target.");
  });
});
