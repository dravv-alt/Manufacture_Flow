import type { BackendCaseSnapshot } from "@/contexts/OperationsContext";
import type { StoryEvidence } from "./story.types";

/**
 * Pure function evaluating if an evidence condition is met against a live snapshot.
 */
export function isEvidenceMet(
  evidence: StoryEvidence,
  snapshot: BackendCaseSnapshot | null
): boolean {
  if (evidence.type === "none") return true;
  if (!snapshot) return false;

  const workOrder = snapshot.maintenanceWorkOrders?.[0];

  switch (evidence.type) {
    case "active_case":
      return Boolean(snapshot.failureCase && workOrder);

    case "bearing_reserved":
      return Boolean(
        snapshot.resourceRecoveryResults?.some((r) => r.outcome === "reserved") ||
        snapshot.inventory?.some((item) => item.reserved > 0) ||
        snapshot.reservations?.some((r) => r.status === "active" || r.status === "reserved")
      );

    case "reroute_approved":
      return Boolean(snapshot.reroutePlans?.some((p) => p.state === "approved"));

    case "notification_created":
      return Boolean(snapshot.notifications && snapshot.notifications.length > 0);

    case "maintenance_stage":
      return Boolean(workOrder && workOrder.stage >= evidence.min);

    case "validation_failed":
      return Boolean(
        snapshot.events?.some((e) => e.eventType === "return_to_service_validation_failed") &&
        snapshot.allocationLocks?.some((l) => l.state === "active")
      );

    case "workflow_recovered":
      return Boolean(
        snapshot.failureCase?.workflowState?.toLowerCase().includes("recovered") &&
        snapshot.allocationLocks?.every((l) => l.state === "released")
      );

    default:
      return true;
  }
}

/**
 * Human-readable description of an evidence condition for diagnostics and timeout UX.
 */
export function evidenceLabel(evidence: StoryEvidence): string {
  switch (evidence.type) {
    case "none":
      return "No evidence required";
    case "active_case":
      return "Active failure case with maintenance work order";
    case "bearing_reserved":
      return "Bearing reservation recorded in warehouse";
    case "reroute_approved":
      return "Production reroute plan approved";
    case "notification_created":
      return "Stakeholder notification queued";
    case "maintenance_stage":
      return `Maintenance work order at stage ≥ ${evidence.min}`;
    case "validation_failed":
      return "Return-to-service validation failure registered (requires intervention)";
    case "workflow_recovered":
      return "System recovered and all locks released";
    default:
      return "Condition satisfied";
  }
}
