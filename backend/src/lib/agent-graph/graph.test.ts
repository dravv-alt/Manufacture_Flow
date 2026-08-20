import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";
import { routeAfterDeliveryImpact, routeAfterFailurePrediction, routeAfterProcurementAutomation, routeAfterRecoveryOrchestrator, routeAfterResourceRecovery } from "./routing/conditions";
import { initialRecoveryGraphState } from "./state";

describe("Recovery LangGraph routing", () => {
  it("routes Delivery Impact to final stakeholder notifications", () => {
    const state = { ...initialRecoveryGraphState({ correlationId: "recovery:test-final-notification", graphRunId: "00000000-0000-0000-0000-000000000012", telemetrySourceEventId: "telemetry-test-final-notification" }), deliveryImpactOutcome: "calculated" as const };
    expect(routeAfterDeliveryImpact(state)).toBe("final_stakeholder_notification");
  });
  it("routes a persisted prediction to failure alerting", () => {
    const state = { ...initialRecoveryGraphState({ correlationId: "recovery:test-prediction", graphRunId: "00000000-0000-0000-0000-000000000001", telemetrySourceEventId: "telemetry-test-prediction" }), predictionId: "00000000-0000-0000-0000-000000000002" };
    expect(routeAfterFailurePrediction(state)).toBe("failure_alerting");
  });

  it("ends graph processing when no prediction is produced", () => {
    const state = initialRecoveryGraphState({ correlationId: "recovery:test-monitoring", graphRunId: "00000000-0000-0000-0000-000000000003", telemetrySourceEventId: "telemetry-test-monitoring" });
    expect(routeAfterFailurePrediction(state)).toBe(END);
  });

  it("sends an allocation-locked recovery to resource recovery only", () => {
    const locked = { ...initialRecoveryGraphState({ correlationId: "recovery:test-lock", graphRunId: "00000000-0000-0000-0000-000000000004", telemetrySourceEventId: "telemetry-test-lock" }), allocationLockId: "00000000-0000-0000-0000-000000000005" };
    expect(routeAfterRecoveryOrchestrator(locked)).toBe("resource_recovery");
    expect(routeAfterRecoveryOrchestrator(initialRecoveryGraphState({ correlationId: "recovery:test-at-risk", graphRunId: "00000000-0000-0000-0000-000000000006", telemetrySourceEventId: "telemetry-test-at-risk" }))).toBe(END);
  });

  it("sends only procurement-required recovery outcomes to procurement automation", () => {
    const procurementRequired = { ...initialRecoveryGraphState({ correlationId: "recovery:test-procurement", graphRunId: "00000000-0000-0000-0000-000000000007", telemetrySourceEventId: "telemetry-test-procurement" }), resourceRecoveryOutcome: "procurement_required" as const };
    expect(routeAfterResourceRecovery(procurementRequired)).toBe("procurement_automation");
    expect(routeAfterResourceRecovery(initialRecoveryGraphState({ correlationId: "recovery:test-reserved", graphRunId: "00000000-0000-0000-0000-000000000008", telemetrySourceEventId: "telemetry-test-reserved" }))).toBe(END);
  });

  it("routes local spares and successful procurement to maintenance work-order creation", () => {
    const localSpare = { ...initialRecoveryGraphState({ correlationId: "recovery:test-local-spare", graphRunId: "00000000-0000-0000-0000-000000000009", telemetrySourceEventId: "telemetry-test-local-spare" }), resourceRecoveryOutcome: "reserved" as const };
    const successfulProcurement = { ...initialRecoveryGraphState({ correlationId: "recovery:test-procurement-success", graphRunId: "00000000-0000-0000-0000-000000000010", telemetrySourceEventId: "telemetry-test-procurement-success" }), procurementAutomationOutcome: "requisition_created" as const };
    expect(routeAfterResourceRecovery(localSpare)).toBe("maintenance_work_order");
    expect(routeAfterProcurementAutomation(successfulProcurement)).toBe("maintenance_work_order");
    expect(routeAfterProcurementAutomation(initialRecoveryGraphState({ correlationId: "recovery:test-no-vendor", graphRunId: "00000000-0000-0000-0000-000000000011", telemetrySourceEventId: "telemetry-test-no-vendor" }))).toBe(END);
  });
});
