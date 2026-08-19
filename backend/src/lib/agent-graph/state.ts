import { Annotation } from "@langchain/langgraph";

export type RecoveryWorkflowStatus = "MONITORING" | "FAILURE_PREDICTED" | "RECOVERY_RUNNING" | "REQUIRES_INTERVENTION" | "RECOVERY_VALIDATION" | "COMPLETED" | "FAILED";

export type RecoveryGraphError = { node: string; message: string; occurredAt: string };

export const RecoveryGraphStateAnnotation = Annotation.Root({
  correlationId: Annotation<string>,
  graphRunId: Annotation<string>,
  telemetrySourceEventId: Annotation<string>,
  workstationCode: Annotation<string | null>,
  telemetrySeverity: Annotation<"none" | "warning" | "critical" | null>,
  predictionId: Annotation<string | null>,
  failureCaseExternalId: Annotation<string | null>,
  failureComponent: Annotation<string | null>,
  requiredPartCode: Annotation<string | null>,
  allocationLockId: Annotation<string | null>,
  rerouteEvaluationJobIds: Annotation<string[]>({ reducer: (_current, update) => update, default: () => [] }),
  resourceRecoveryResultId: Annotation<string | null>,
  inventoryReservationId: Annotation<string | null>,
  resourceRecoveryOutcome: Annotation<"reserved" | "procurement_required" | null>,
  alertNotificationIds: Annotation<string[]>({ reducer: (_current, update) => update, default: () => [] }),
  workflowStatus: Annotation<RecoveryWorkflowStatus>,
  errors: Annotation<RecoveryGraphError[]>({ reducer: (current, update) => [...current, ...update], default: () => [] }),
});

export type RecoveryGraphState = typeof RecoveryGraphStateAnnotation.State;
export type RecoveryGraphUpdate = typeof RecoveryGraphStateAnnotation.Update;

export function initialRecoveryGraphState(input: { correlationId: string; graphRunId: string; telemetrySourceEventId: string }): RecoveryGraphState {
  return {
    ...input,
    workstationCode: null,
    telemetrySeverity: null,
    predictionId: null,
    failureCaseExternalId: null,
    failureComponent: null,
    requiredPartCode: null,
    allocationLockId: null,
    rerouteEvaluationJobIds: [],
    resourceRecoveryResultId: null,
    inventoryReservationId: null,
    resourceRecoveryOutcome: null,
    alertNotificationIds: [],
    workflowStatus: "MONITORING",
    errors: [],
  };
}
