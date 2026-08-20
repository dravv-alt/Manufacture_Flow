import { describe, expect, it } from "vitest";
import { MAINTENANCE_STAGE, MaintenanceStagePolicyError, nextMaintenanceStage } from "./policy";

describe("maintenance execution stage policy", () => {
  it("enforces start, repair, testing, validation, and return-to-service ordering", () => {
    expect(nextMaintenanceStage({ stage: 1, command: "start_maintenance" })).toBe(3);
    expect(nextMaintenanceStage({ stage: 3, command: "record_repair_completion" })).toBe(4);
    expect(nextMaintenanceStage({ stage: 4, command: "start_machine_testing" })).toBe(5);
    expect(nextMaintenanceStage({ stage: 5, command: "record_return_to_service_validation", validationPassed: true })).toBe(7);
  });

  it("keeps failed validation unresolved and allows controlled rework", () => {
    expect(nextMaintenanceStage({ stage: 5, command: "record_return_to_service_validation", validationPassed: false })).toBe(5);
    expect(nextMaintenanceStage({ stage: 5, command: "record_repair_completion", reworkRequired: true })).toBe(4);
  });

  it("rejects validation before repair/testing and any transition after completion", () => {
    expect(() => nextMaintenanceStage({ stage: 3, command: "record_return_to_service_validation", validationPassed: true })).toThrow(MaintenanceStagePolicyError);
    expect(() => nextMaintenanceStage({ stage: MAINTENANCE_STAGE.RETURNED_TO_SERVICE, command: "start_maintenance" })).toThrow(MaintenanceStagePolicyError);
  });
});
