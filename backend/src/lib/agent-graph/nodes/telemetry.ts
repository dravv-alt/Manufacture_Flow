import { and, eq } from "drizzle-orm";
import type { RecoveryGraphState, RecoveryGraphUpdate } from "@/lib/agent-graph/state";
import { db } from "@/lib/db/client";
import { agentRuns, recoveryGraphRuns, telemetryReadings, workstations } from "@/lib/db/schema";

export class RecoveryGraphInputNotFoundError extends Error {}

async function persist(state: RecoveryGraphState, patch: RecoveryGraphUpdate) {
  await db.update(recoveryGraphRuns).set({ state: { ...state, ...patch } }).where(eq(recoveryGraphRuns.id, state.graphRunId));
}

export async function telemetryMonitorNode(state: RecoveryGraphState): Promise<RecoveryGraphUpdate> {
  const [reading] = await db.select({ severity: telemetryReadings.anomalySeverity, workstationCode: workstations.code }).from(telemetryReadings)
    .innerJoin(workstations, eq(telemetryReadings.workstationId, workstations.id))
    .where(eq(telemetryReadings.sourceEventId, state.telemetrySourceEventId)).limit(1);
  if (!reading) throw new RecoveryGraphInputNotFoundError(`Telemetry source event ${state.telemetrySourceEventId} was not found.`);

  await db.update(agentRuns).set({ correlationId: state.correlationId }).where(and(eq(agentRuns.agentName, "TelemetryMonitorAgent"), eq(agentRuns.sourceEventId, state.telemetrySourceEventId)));
  const patch: RecoveryGraphUpdate = { workstationCode: reading.workstationCode, telemetrySeverity: reading.severity };
  await persist(state, patch);
  return patch;
}
