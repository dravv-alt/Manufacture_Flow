import { describe, expect, it } from "vitest";
import { createMaintenancePlan } from "./maintenance-work-order";

describe("MaintenanceWorkOrderAgent planning", () => {
  it("creates a deterministic critical local-spare repair window and checklist", () => {
    const plan = createMaintenancePlan({ component: "Servo bearing", partCode: "BRG-10023", source: "local_spare", anchorTime: new Date("2026-08-20T00:00:00.000Z") });
    expect(plan).toMatchObject({ priority: "critical", diagnosis: "Predicted failure: Servo bearing. Required part: BRG-10023." });
    expect(plan.plannedWindowStart.toISOString()).toBe("2026-08-20T02:00:00.000Z");
    expect(plan.checklist).toHaveLength(5);
  });

  it("uses the deterministic procurement planning window without calculating a recovery ETA", () => {
    const plan = createMaintenancePlan({ component: "Servo bearing", partCode: "BRG-10023", source: "procurement", anchorTime: new Date("2026-08-20T00:00:00.000Z") });
    expect(plan.plannedWindowStart.toISOString()).toBe("2026-08-21T00:00:00.000Z");
  });
});
