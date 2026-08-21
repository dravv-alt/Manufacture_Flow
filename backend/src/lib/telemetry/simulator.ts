import { ingestTelemetry } from "@/lib/telemetry/service";
import { db } from "@/lib/db/client";
import { machineMetricSnapshots } from "@/lib/db/schema";

type MachineProfile = { code: string; temperature: number; vibration: number; pressure: number; current: number; cycles: number; degradation: number; errorCode?: string };

// demo_data: deterministic profiles model normal operation, gradual wear, and an active bearing fault.
const profiles: readonly MachineProfile[] = [
  { code: "WS-102", temperature: 78, vibration: 3.8, pressure: 5.2, current: 21.2, cycles: 45230, degradation: 1.15, errorCode: "X_AXIS_VIBRATION" },
  { code: "WS-105", temperature: 46, vibration: 1.2, pressure: 5.5, current: 11.1, cycles: 31000, degradation: 0.12 },
  { code: "WS-108", temperature: 70, vibration: 2.6, pressure: 5.8, current: 18.2, cycles: 89100, degradation: 0.34 },
  { code: "WS-112", temperature: 42, vibration: 1.0, pressure: 4.8, current: 9.6, cycles: 124000, degradation: 0.08 },
];
let realtimeTick = 0;

function round(value: number, decimals = 1) { const scale = 10 ** decimals; return Math.round(value * scale) / scale; }

function readingFor(profile: MachineProfile, sequence: number, observedAt: Date, namespace: string) {
  // Deterministic drift + bounded cyclic load: reproducible seeds, non-random behavior.
  const wave = Math.sin(sequence * 0.9 + profile.cycles / 10_000);
  const wear = sequence * profile.degradation;
  return {
    sourceEventId: `${namespace}:${profile.code}:${sequence}`,
    workstationCode: profile.code,
    observedAt,
    temperatureCelsius: round(profile.temperature + wear + wave * 0.7),
    vibrationMmPerSecond: round(profile.vibration + wear * 0.08 + wave * 0.08, 2),
    pressureBar: round(profile.pressure - wear * 0.01 + wave * 0.04, 2),
    motorCurrentAmps: round(profile.current + wear * 0.18 + wave * 0.25),
    cycleCount: profile.cycles + sequence * 45,
    activeErrorCodes: profile.errorCode && sequence >= 4 ? [profile.errorCode] : [],
  };
}

function metricsFor(profile: MachineProfile, sequence: number, observedAt: Date, sourceEventId: string) {
  const wear = sequence * profile.degradation;
  const availability = Math.max(70, 99.2 - wear * 1.7);
  const performance = Math.max(68, 98 - wear * 1.2);
  const quality = Math.max(92, 99.7 - wear * 0.45);
  const oee = round((availability * performance * quality) / 10_000);
  const cycleTime = round(42 + wear * 1.8 + (profile.code === "WS-112" ? 12 : 0), 1);
  const estimatedRulDays = Math.max(1, Math.round(180 / (1 + wear * 0.8)));
  const lastMaintenanceAt = new Date(observedAt.getTime() - (profile.code === "WS-102" ? 101 : 42) * 86_400_000);
  const nextMaintenanceAt = new Date(observedAt.getTime() + Math.max(1, Math.round(estimatedRulDays / 3)) * 86_400_000);
  const powerKw = round((Math.sqrt(3) * 400 * (profile.current + wear * 0.18) * 0.82) / 1000);
  return { sourceEventId, observedAt, powerKw, availabilityPercent: round(availability), performancePercent: round(performance), qualityPercent: round(quality), oeePercent: oee, cycleTimeSeconds: cycleTime, outputPerHour: Math.max(1, Math.floor(3600 / cycleTime * (performance / 100))), defectRatePercent: round(100 - quality, 2), estimatedRulDays, operatorId: profile.code === "WS-112" ? "SYS" : `OP-${profile.code.slice(-3)}`, firmwareVersion: `v${profile.code.slice(-1)}.2.0`, networkPingMs: Math.round(10 + wear * 2.5), lastMaintenanceAt, nextMaintenanceAt };
}

export async function seedSimulatedTelemetry(namespace: string, anchor = new Date("2026-08-21T10:00:00.000Z"), samplesPerMachine = 6) {
  const results = [];
  for (const profile of profiles) for (let sequence = 0; sequence < samplesPerMachine; sequence += 1) {
    const observedAt = new Date(anchor.getTime() - (samplesPerMachine - 1 - sequence) * 5 * 60_000);
    const input = readingFor(profile, sequence, observedAt, namespace);
    const result = await ingestTelemetry(input);
    await db.insert(machineMetricSnapshots).values({ workstationId: result.reading.workstationId, telemetryReadingId: result.reading.id, ...metricsFor(profile, sequence, observedAt, input.sourceEventId) }).onConflictDoNothing({ target: machineMetricSnapshots.sourceEventId });
    results.push(result);
  }
  return results;
}

export async function simulateTelemetryTick(now = new Date()) {
  realtimeTick = (realtimeTick + 1) % 12;
  const sequence = realtimeTick;
  const results = [];
  for (const profile of profiles) { const input = readingFor(profile, sequence, now, `simulated-tick-${realtimeTick}`); const result = await ingestTelemetry(input); await db.insert(machineMetricSnapshots).values({ workstationId: result.reading.workstationId, telemetryReadingId: result.reading.id, ...metricsFor(profile, sequence, now, input.sourceEventId) }).onConflictDoNothing({ target: machineMetricSnapshots.sourceEventId }); results.push(result); }
  return results;
}
