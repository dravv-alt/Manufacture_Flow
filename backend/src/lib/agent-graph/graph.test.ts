import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";
import { routeAfterFailurePrediction, routeAfterRecoveryOrchestrator, routeAfterResourceRecovery } from "./routing/conditions";
import { initialRecoveryGraphState } from "./state";

describe("Recovery LangGraph routing", () => {
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
});
