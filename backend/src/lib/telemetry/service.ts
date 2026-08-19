import { desc, eq } from "drizzle-orm";
import { assessTelemetry } from "@/lib/agents/telemetry-monitor";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, telemetryReadings, workflowEvents, workstations } from "@/lib/db/schema";
import type { TelemetryIngestInput } from "@/lib/telemetry/validation";

export class TelemetryNotFoundError extends Error {}

export async function ingestTelemetry(input: TelemetryIngestInput) {
  const [workstation] = await db.select().from(workstations).where(eq(workstations.code, input.workstationCode)).limit(1);
  if (!workstation) throw new TelemetryNotFoundError(`Workstation ${input.workstationCode} was not found.`);

  const assessment = assessTelemetry(input);
  const inserted = await db.insert(telemetryReadings).values({
    workstationId: workstation.id,
    sourceEventId: input.sourceEventId,
    observedAt: input.observedAt,
    temperatureCelsius: input.temperatureCelsius,
    vibrationMmPerSecond: input.vibrationMmPerSecond,
    pressureBar: input.pressureBar,
    cycleCount: input.cycleCount,
    motorCurrentAmps: input.motorCurrentAmps,
    activeErrorCodes: input.activeErrorCodes,
    anomalySeverity: assessment.severity,
    anomalyReasons: assessment.reasons,
  }).onConflictDoNothing({ target: telemetryReadings.sourceEventId }).returning();

  if (!inserted[0]) {
    const [existing] = await db.select().from(telemetryReadings).where(eq(telemetryReadings.sourceEventId, input.sourceEventId)).limit(1);
    if (!existing) throw new Error("Telemetry idempotency lookup failed.");
    return { idempotent: true, reading: existing, assessment: { severity: existing.anomalySeverity, reasons: existing.anomalyReasons, policyVersion: "controlled-v1" as const } };
  }

  const reading = inserted[0];
  const [run] = await db.insert(agentRuns).values({
    agentName: "TelemetryMonitorAgent",
    status: "running",
    workstationId: workstation.id,
    sourceEventId: input.sourceEventId,
    input: { ...input, observedAt: input.observedAt.toISOString() },
  }).returning();

  const output = { readingId: reading.id, severity: assessment.severity, reasons: assessment.reasons, policyVersion: assessment.policyVersion };
  await db.update(agentRuns).set({ status: "completed", output, completedAt: new Date() }).where(eq(agentRuns.id, run.id));

  if (assessment.severity !== "none") {
    const [failureCase] = await db.select().from(failureCases).where(eq(failureCases.workstationId, workstation.id)).orderBy(desc(failureCases.detectedAt)).limit(1);
    if (failureCase) {
      await db.insert(workflowEvents).values({
        failureCaseId: failureCase.id,
        entityType: "telemetry_reading",
        entityId: reading.id,
        eventType: "telemetry_anomaly_observed",
        actor: "Telemetry Monitor Agent",
        payload: output,
      });
    }
  }

  return { idempotent: false, reading, assessment, agentRun: { id: run.id, status: "completed" as const } };
}

export async function listRecentTelemetry(workstationCode: string, limit: number) {
  const [workstation] = await db.select().from(workstations).where(eq(workstations.code, workstationCode)).limit(1);
  if (!workstation) throw new TelemetryNotFoundError(`Workstation ${workstationCode} was not found.`);
  const readings = await db.select().from(telemetryReadings).where(eq(telemetryReadings.workstationId, workstation.id)).orderBy(desc(telemetryReadings.observedAt)).limit(limit);
  return { workstation: { code: workstation.code, name: workstation.name }, readings };
}
