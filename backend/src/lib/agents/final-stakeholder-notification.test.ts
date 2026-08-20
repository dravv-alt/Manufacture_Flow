import { describe, expect, it } from "vitest";
import { createFinalStakeholderNotificationDrafts, SHIPMENT_CUSTOMER_SERVICE_EQUIVALENT_ROLE } from "./final-stakeholder-notification";

describe("FinalStakeholderNotificationAgent recipient policy", () => {
  it("queues scheduler and current shipment/customer-service equivalent roles for on-time impacts", () => {
    const drafts = createFinalStakeholderNotificationDrafts({ failureCaseExternalId: "FC-1", classifications: ["ON_TIME"], commitmentCount: 1 });
    expect(drafts.map((draft) => draft.recipientRole)).toEqual(["Scheduler", SHIPMENT_CUSTOMER_SERVICE_EQUIVALENT_ROLE]);
    expect(drafts.every((draft) => draft.subject.includes("ON_TIME"))).toBe(true);
  });

  it.each(["AT_RISK", "DELAYED"] as const)("includes Plant Manager for %s delivery impact", (classification) => {
    const drafts = createFinalStakeholderNotificationDrafts({ failureCaseExternalId: "FC-2", classifications: [classification], commitmentCount: 2 });
    expect(drafts.map((draft) => draft.recipientRole)).toEqual(["Scheduler", "Logistics Team", "Plant Manager"]);
  });

  it("uses the highest persisted impact and creates nothing without a commitment", () => {
    expect(createFinalStakeholderNotificationDrafts({ failureCaseExternalId: "FC-3", classifications: ["ON_TIME", "DELAYED"], commitmentCount: 2 })[0]?.subject).toContain("DELAYED");
    expect(createFinalStakeholderNotificationDrafts({ failureCaseExternalId: "FC-3", classifications: [], commitmentCount: 0 })).toEqual([]);
  });
});
