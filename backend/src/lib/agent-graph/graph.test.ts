import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";
import { routeAfterFailurePrediction } from "./routing/conditions";
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
});
