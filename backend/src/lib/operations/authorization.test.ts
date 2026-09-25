import { describe, expect, it } from "vitest";
import { isWorkflowActionAllowed } from "./authorization";

describe("maintenance execution RBAC", () => {
  it("allows Maintenance Lead and Plant Manager to execute controlled maintenance", () => {
    expect(isWorkflowActionAllowed("schedule_maintenance", "Scheduler")).toBe(true);
    expect(isWorkflowActionAllowed("review_reroute", "Scheduler")).toBe(true);
    expect(isWorkflowActionAllowed("confirm_reroute", "Plant Manager")).toBe(true);
    expect(isWorkflowActionAllowed("start_maintenance", "Maintenance Lead")).toBe(true);
    expect(isWorkflowActionAllowed("record_return_to_service_validation", "Plant Manager")).toBe(true);
  });

  it("rejects unrelated operational roles", () => {
    expect(isWorkflowActionAllowed("schedule_maintenance", "Logistics Team")).toBe(false);
    expect(isWorkflowActionAllowed("review_reroute_job", "Logistics Team")).toBe(false);
    expect(isWorkflowActionAllowed("start_maintenance", "Logistics Team")).toBe(false);
    expect(isWorkflowActionAllowed("record_return_to_service_validation", "Scheduler")).toBe(false);
  });
});
