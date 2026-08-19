import { describe, expect, it } from "vitest";
import { createFailurePredictionAlerts } from "./failure-prediction-alerting";

describe("FailurePredictionAlertingAgent", () => {
  const alerts = createFailurePredictionAlerts({ workstationCode: "WS-102", component: "X-Axis Servo Motor Bearing", partCode: "BRG-10023", probability: 92, ttfHours: 18, failureCaseExternalId: "FC-2026-0047" });

  it("creates exactly the three required role-specific recipients", () => {
    expect(alerts.map((alert) => alert.recipientRole)).toEqual(["Production Supervisor", "Maintenance Manager", "Plant Head"]);
  });

  it("keeps production, maintenance, and leadership instructions distinct", () => {
    expect(alerts[0].detail).toContain("intervention window");
    expect(alerts[1].detail).toContain("BRG-10023");
    expect(alerts[2].detail).toContain("No allocation, procurement, or shipment action");
  });
});
