import { describe, expect, it } from "vitest";
import { rankEligibleVendors } from "./procurement-automation";

describe("ProcurementAutomationAgent vendor ranking", () => {
  it("filters invalid suppliers and ranks eligible suppliers deterministically", () => {
    const ranked = rankEligibleVendors([
      { vendorId: "inactive", vendorName: "Inactive", contactEmail: "inactive@example.test", approved: true, active: false, capabilityActive: true, leadTimeHours: 2, unitCostCents: 1, reliabilityScore: 100 },
      { vendorId: "slower", vendorName: "Slower", contactEmail: "slower@example.test", approved: true, active: true, capabilityActive: true, leadTimeHours: 10, unitCostCents: 100, reliabilityScore: 99 },
      { vendorId: "best", vendorName: "Best", contactEmail: "best@example.test", approved: true, active: true, capabilityActive: true, leadTimeHours: 8, unitCostCents: 120, reliabilityScore: 95 },
      { vendorId: "same-time-cheaper", vendorName: "Cheaper", contactEmail: "cheaper@example.test", approved: true, active: true, capabilityActive: true, leadTimeHours: 8, unitCostCents: 110, reliabilityScore: 90 },
    ]);
    expect(ranked.map((vendor) => vendor.vendorId)).toEqual(["same-time-cheaper", "best", "slower"]);
  });
});
