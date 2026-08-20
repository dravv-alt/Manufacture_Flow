import type { users } from "@/lib/db/schema";

export type UserRole = typeof users.$inferSelect.role;

export const WORKFLOW_ACTION_ROLES = {
  reserve_part: ["Plant Manager", "Warehouse Team"],
  approve_reroute: ["Plant Manager", "Scheduler"],
  advance_maintenance: ["Plant Manager", "Maintenance Lead"],
  start_maintenance: ["Plant Manager", "Maintenance Lead"],
  record_repair_completion: ["Plant Manager", "Maintenance Lead"],
  start_machine_testing: ["Plant Manager", "Maintenance Lead"],
  record_return_to_service_validation: ["Plant Manager", "Maintenance Lead"],
  acknowledge_notification: ["Plant Manager", "Production Supervisor", "Maintenance Lead", "Scheduler", "Warehouse Team", "Procurement Team", "Logistics Team"],
  retry_notification: ["Plant Manager", "Logistics Team"],
  set_procurement_state: ["Plant Manager", "Procurement Team"],
  record_procurement_note: ["Plant Manager", "Procurement Team"],
  set_shipment_state: ["Plant Manager", "Logistics Team"],
} as const satisfies Record<string, readonly UserRole[]>;

export type ProtectedWorkflowAction = keyof typeof WORKFLOW_ACTION_ROLES;

export function isWorkflowActionAllowed(action: ProtectedWorkflowAction, role: UserRole) {
  return (WORKFLOW_ACTION_ROLES[action] as readonly UserRole[]).includes(role);
}
