import { describe, expect, it } from "vitest";
import { getScenarioSteps } from "./scenarios";
import { normalizeRecoveryScenario } from "../../demo-data/ws102-scenario";

describe("shared Story Mode scenarios", () => {
  it("keeps intentional fail, rework, and pass in the Golden scenario", () => {
    const ids = getScenarioSteps("golden").map((step) => step.id);
    expect(ids).toEqual(expect.arrayContaining(["validation-fail", "rework", "retest", "validation-pass"]));
  });

  it("proves the local spare branch without procurement or forced rework", () => {
    const ids = getScenarioSteps("local-spare").map((step) => step.id);
    expect(ids).toContain("inventory");
    expect(ids).toContain("reserve-bearing");
    expect(ids).toContain("reserve-bearing-confirm");
    expect(ids).not.toEqual(expect.arrayContaining(["procurement", "validation-fail", "rework", "retest"]));
  });

  it("proves the failure rework branch", () => {
    const ids = getScenarioSteps("failure-rework").map((step) => step.id);
    expect(ids).toContain("allocation-lock");
    expect(ids).toContain("validation-fail");
    expect(ids).toContain("rework");
    expect(ids).not.toEqual(expect.arrayContaining(["procurement", "reroute", "shipment", "notifications"]));
  });

  it("uses semantic data-story targets instead of generated CSS selectors", () => {
    for (const step of getScenarioSteps("golden")) {
      if (step.target) {
        expect(step.target).toMatch(/^\[data-story='[a-z0-9-]+'\]$/);
      }
    }
  });

  it("ensures all action steps with workflow commands have explicit evidence", () => {
    for (const scenario of ["golden", "local-spare", "failure-rework"] as const) {
      for (const step of getScenarioSteps(scenario)) {
        if (step.mode === "action" && step.action.type === "workflow") {
          expect(step.evidence.type).not.toBe("none");
        }
      }
    }
  });

  it("normalizes persisted backend scenario values to UI recovery paths", () => {
    expect(normalizeRecoveryScenario("local")).toBe("local");
    expect(normalizeRecoveryScenario("procurement")).toBe("vendor");
    expect(normalizeRecoveryScenario(undefined)).toBe("vendor");
  });
});
