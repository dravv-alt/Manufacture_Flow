import { eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { recoveryGraphRuns } from "@/lib/db/schema";
import { runMaintenanceWorkOrderCreation } from "@/lib/maintenance-work-order/service";

export async function maintenanceWorkOrderNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  if (!state.resourceRecoveryResultId || !state.failureCaseExternalId || !state.failureComponent || !state.requiredPartCode) {
    return { workflowStatus: "REQUIRES_INTERVENTION", errors: [{ node: "maintenance_work_order", message: "Maintenance work-order context is incomplete.", occurredAt: new Date().toISOString() }] };
  }
  const response = await runMaintenanceWorkOrderCreation({ resourceRecoveryResultId: state.resourceRecoveryResultId, correlationId: state.correlationId, failureCaseExternalId: state.failureCaseExternalId, component: state.failureComponent, requiredPartCode: state.requiredPartCode, inventoryReservationId: state.inventoryReservationId, procurementAutomationResultId: state.procurementAutomationResultId });
  const patch: RecoveryGraphUpdate = { maintenanceWorkOrderId: response.workOrder.id, workflowStatus: "REQUIRES_INTERVENTION" };
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
  return patch;
}
