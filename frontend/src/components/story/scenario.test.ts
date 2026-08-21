import { describe, expect, it } from "vitest";
import { getStorySteps } from "./scenario";
import { normalizeRecoveryScenario } from "../../demo-data/ws102-scenario";

describe("shared Story Mode scenarios", () => {
  it("keeps intentional fail, rework, and pass in the Golden scenario", () => {
    const ids = getStorySteps("golden").map((step) => step.id);
    expect(ids).toEqual(expect.arrayContaining(["validation-fail", "rework", "retest", "validation-pass"]));
  });

  it("proves the local spare branch without procurement or forced rework", () => {
    const ids = getStorySteps("local-spare").map((step) => step.id);
    expect(ids).toContain("inventory");
    expect(ids).not.toEqual(expect.arrayContaining(["procurement", "validation-fail", "rework", "retest"]));
  });

  it("uses semantic tour targets instead of generated CSS selectors", () => {
    for (const step of getStorySteps("golden")) expect(step.target).toMatch(/^\[data-tour-id='[a-z0-9-]+'\]$/);
  });

  it("normalizes persisted backend scenario values to UI recovery paths", () => {
    expect(normalizeRecoveryScenario("local")).toBe("local");
    expect(normalizeRecoveryScenario("procurement")).toBe("vendor");
    expect(normalizeRecoveryScenario(undefined)).toBe("vendor");
  });
});
