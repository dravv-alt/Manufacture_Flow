export const MAINTENANCE_STAGE = {
  CREATED: 1,
  WAITING_FOR_PART: 2,
  PLANNED_OR_STARTED: 3,
  REPAIR_COMPLETED: 4,
  TESTING: 5,
  VALIDATION: 6,
  RETURNED_TO_SERVICE: 7,
} as const;

export type MaintenanceExecutionCommandType = "start_maintenance" | "record_repair_completion" | "start_machine_testing" | "record_return_to_service_validation";

export class MaintenanceStagePolicyError extends Error {}

export function nextMaintenanceStage(input: { stage: number; command: MaintenanceExecutionCommandType; validationPassed?: boolean; reworkRequired?: boolean }) {
  if (input.stage === MAINTENANCE_STAGE.RETURNED_TO_SERVICE) throw new MaintenanceStagePolicyError("Maintenance work order is already completed.");
  if (input.command === "start_maintenance") {
    if (input.stage < MAINTENANCE_STAGE.CREATED || input.stage > MAINTENANCE_STAGE.PLANNED_OR_STARTED) throw new MaintenanceStagePolicyError("Maintenance cannot be started from the current work-order stage.");
    return MAINTENANCE_STAGE.PLANNED_OR_STARTED;
  }
  if (input.command === "record_repair_completion") {
    const initialRepair = input.stage === MAINTENANCE_STAGE.PLANNED_OR_STARTED;
    const approvedRework = input.reworkRequired && (input.stage === MAINTENANCE_STAGE.TESTING || input.stage === MAINTENANCE_STAGE.VALIDATION);
    if (!initialRepair && !approvedRework) throw new MaintenanceStagePolicyError("Repair completion requires started maintenance or a recorded validation failure requiring rework.");
    return MAINTENANCE_STAGE.REPAIR_COMPLETED;
  }
  if (input.command === "start_machine_testing") {
    if (input.stage !== MAINTENANCE_STAGE.REPAIR_COMPLETED) throw new MaintenanceStagePolicyError("Machine testing requires recorded repair completion.");
    return MAINTENANCE_STAGE.TESTING;
  }
  if (input.stage !== MAINTENANCE_STAGE.TESTING && input.stage !== MAINTENANCE_STAGE.VALIDATION) throw new MaintenanceStagePolicyError("Return-to-service validation requires completed repair and machine testing.");
  return input.validationPassed ? MAINTENANCE_STAGE.RETURNED_TO_SERVICE : input.stage;
}
