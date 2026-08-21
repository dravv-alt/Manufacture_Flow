import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { runRecoveryGraph } from "@/lib/agent-graph/graph";
import { db } from "@/lib/db/client";
import { inventoryItems, parts, plants, productionJobs, shipmentCommitments, users, vendorPartCapabilities, vendors, workstationCapabilities, workstations } from "@/lib/db/schema";
import { activeDatabaseUrl, assertDemoDatabaseSafety, publicRuntimeInfo } from "@/lib/runtime/config";
import { ingestTelemetry } from "@/lib/telemetry/service";
import { seedSimulatedTelemetry, simulateTelemetryTick } from "@/lib/telemetry/simulator";

export const demoScenarioIds = ["golden", "local-spare", "failure-rework"] as const;
export type DemoScenarioId = (typeof demoScenarioIds)[number];

const BUSINESS_TABLES = [
  "notification_attempts", "notifications", "vendor_notifications", "procurement_messages",
  "shipment_impacts", "shipment_commitments", "reroute_decisions", "reroute_plans",
  "recovery_time_estimates", "maintenance_work_orders", "procurement_automation_results",
  "procurement_requests", "resource_recovery_results", "inventory_reservations",
  "workstation_allocation_locks", "failure_predictions", "recovery_graph_runs", "agent_runs",
  "workflow_events", "telemetry_readings", "production_jobs", "workstation_capabilities",
  "failure_cases", "inventory_items", "vendor_part_capabilities", "vendors", "parts",
  "workstations", "plants",
] as const;

const DEMO_MANAGER_EMAIL = "demo.manager@manufacture-flow.local";
export const DEMO_MANAGER_PASSWORD = "ManufactureFlowDemo!2026";

async function withDemoMutationLock<T>(operation: (safety: ReturnType<typeof assertDemoDatabaseSafety>) => Promise<T>) {
  const safety = assertDemoDatabaseSafety();
  const lockClient = postgres(activeDatabaseUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    const [identity] = await lockClient<{ database: string }[]>`select current_database() as database`;
    if (!identity || identity.database !== safety.databaseName) {
      throw new Error(`Demo mutation refused: connected database ${identity?.database ?? "unknown"} does not match configured Demo database ${safety.databaseName}.`);
    }
    await lockClient`select pg_advisory_lock(hashtext('manufacture-flow:demo-mutation'))`;
    try {
      return await operation(safety);
    } finally {
      await lockClient`select pg_advisory_unlock(hashtext('manufacture-flow:demo-mutation'))`;
    }
  } finally {
    await lockClient.end({ timeout: 5 });
  }
}

async function ensureDemoManager() {
  const passwordHash = await bcrypt.hash(DEMO_MANAGER_PASSWORD, 12);
  const [user] = await db.insert(users).values({ email: DEMO_MANAGER_EMAIL, displayName: "Demo Plant Manager", role: "Plant Manager", passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { displayName: "Demo Plant Manager", role: "Plant Manager", passwordHash, updatedAt: new Date() } }).returning();
  return user;
}

async function resetDemoScenarioUnlocked(safety: ReturnType<typeof assertDemoDatabaseSafety>, scenario: DemoScenarioId) {
  if (!demoScenarioIds.includes(scenario)) throw new Error(`Unknown Demo scenario ${scenario}.`);
  await db.execute(sql.raw(`TRUNCATE TABLE ${BUSINESS_TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`));
  const manager = await ensureDemoManager();

  const [plant] = await db.insert(plants).values({ code: "DEMO-NORTH-FAB", name: "North Fabrication Demo Plant", timezone: "Asia/Kolkata" }).returning();
  const [ws102, ws105, ws108, ws112] = await db.insert(workstations).values([
    { plantId: plant.id, code: "WS-102", name: "CNC Lathe Alpha", line: "L-03", status: "OPERATIONAL", capacityPercent: 62 },
    { plantId: plant.id, code: "WS-105", name: "CNC Lathe Delta", line: "L-03", status: "OPERATIONAL", capacityPercent: 38 },
    { plantId: plant.id, code: "WS-108", name: "Robotic Arm Beta", line: "L-01", status: "OPERATIONAL", capacityPercent: 44 },
    { plantId: plant.id, code: "WS-112", name: "Conveyor Line Gamma", line: "L-04", status: "OPERATIONAL", capacityPercent: 71 },
  ]).returning();
  const [bearing, actuator] = await db.insert(parts).values([
    { code: "BRG-10023", name: "Servo Motor Bearing", unit: "unit" },
    { code: "ACT-2218", name: "Actuator Joint B", unit: "unit" },
  ]).returning();
  const localSpare = scenario === "local-spare";
  await db.insert(inventoryItems).values([
    { partId: bearing.id, plantId: plant.id, location: "WH-A / Rack B-14", onHand: localSpare ? 3 : 0, reserved: 0, state: localSpare ? "available" : "unavailable" },
    { partId: actuator.id, plantId: plant.id, location: "WH-B / Rack C-02", onHand: 2, reserved: 0, state: "available" },
  ]);
  const [apex, orbit] = await db.insert(vendors).values([
    { name: "Apex Motion Components", contactEmail: "recovery@apexmotion.local", approved: true, active: true },
    { name: "Orbit Industrial Supply", contactEmail: "dispatch@orbit-industrial.local", approved: true, active: true },
  ]).returning();
  await db.insert(vendorPartCapabilities).values([
    { vendorId: apex.id, partId: bearing.id, active: true, leadTimeHours: 8, unitCostCents: 425000, reliabilityScore: 96 },
    { vendorId: orbit.id, partId: bearing.id, active: true, leadTimeHours: 12, unitCostCents: 390000, reliabilityScore: 89 },
  ]);
  const jobs = await db.insert(productionJobs).values([
    { externalId: "J1001", workstationId: ws102.id, state: "in_flight", operationCode: "CNC-TURN", toolingCode: "TL-XA", requiredSkill: "CNC-L2", estimatedLoadPercent: 16 },
    { externalId: "J1002", workstationId: ws102.id, state: "queued", operationCode: "CNC-TURN", toolingCode: "TL-XA", requiredSkill: "CNC-L2", estimatedLoadPercent: 14 },
    { externalId: "J1003", workstationId: ws102.id, state: "queued", operationCode: "CNC-TURN", toolingCode: "TL-XA", requiredSkill: "CNC-L2", estimatedLoadPercent: 12 },
  ]).returning();
  await db.insert(workstationCapabilities).values([
    { workstationId: ws105.id, operationCode: "CNC-TURN", toolingCode: "TL-XA", qualifiedSkill: "CNC-L2" },
    { workstationId: ws108.id, operationCode: "CNC-TURN", toolingCode: "TL-XA", qualifiedSkill: "CNC-L2" },
  ]);
  const base = new Date("2026-08-21T10:00:00.000Z");
  await db.insert(shipmentCommitments).values([
    { externalId: "SO-8841", productionJobIds: [jobs[0].id, jobs[1].id], originalCommittedAt: new Date(base.getTime() + 10 * 60 * 60_000), postCompletionMinutes: 90 },
    { externalId: "SO-8848", productionJobIds: [jobs[2].id], originalCommittedAt: new Date(base.getTime() + 18 * 60 * 60_000), postCompletionMinutes: 60 },
  ]);
  await seedSimulatedTelemetry(`demo-${scenario}-v1`);
  return { ok: true, runtime: publicRuntimeInfo(), safety, scenario, manager: { email: manager.email, role: manager.role }, baseline: { workstation: ws102.code, state: ws102.status, jobs: jobs.map((job) => job.externalId), localSpare } };
}

export function resetDemoScenario(scenario: DemoScenarioId = "golden") {
  return withDemoMutationLock((safety) => resetDemoScenarioUnlocked(safety, scenario));
}

async function triggerDemoTelemetryUnlocked(scenario: DemoScenarioId) {
  await simulateTelemetryTick();
  const [station] = await db.select().from(workstations).where(eq(workstations.code, "WS-102")).limit(1);
  if (!station) throw new Error("Reset and seed a Demo scenario before triggering telemetry.");
  const suffix = `${scenario}-${Date.now()}`;
  const samples = [
    { sourceEventId: `demo-healthy-${suffix}`, temperatureCelsius: 62, vibrationMmPerSecond: 1.5, motorCurrentAmps: 13, activeErrorCodes: [] as string[] },
    { sourceEventId: `demo-warning-${suffix}`, temperatureCelsius: 71, vibrationMmPerSecond: 2.7, motorCurrentAmps: 18.5, activeErrorCodes: [] as string[] },
    { sourceEventId: `demo-critical-${suffix}`, temperatureCelsius: 79, vibrationMmPerSecond: 4.2, motorCurrentAmps: 22, activeErrorCodes: ["X_AXIS_VIBRATION"] },
  ];
  const readings = [];
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    readings.push(await ingestTelemetry({ workstationCode: station.code, observedAt: new Date(Date.now() + index * 1000), pressureBar: 5.2, cycleCount: 18420 + index, ...sample }));
  }
  const criticalSourceEventId = samples[2].sourceEventId;
  const graph = await runRecoveryGraph({ telemetrySourceEventId: criticalSourceEventId, correlationId: `demo-recovery:${suffix}` });
  return { ok: true, scenario, telemetry: readings.map((item) => ({ sourceEventId: item.reading.sourceEventId, severity: item.assessment.severity })), graph };
}

export function triggerDemoTelemetry(scenario: DemoScenarioId = "golden") {
  return withDemoMutationLock(() => triggerDemoTelemetryUnlocked(scenario));
}

/** Advances every controlled machine profile once. Called only by an open Demo browser session. */
export function tickDemoTelemetry() {
  return withDemoMutationLock(async () => {
    const readings = await simulateTelemetryTick();
    return { ok: true, telemetry: readings.map((item) => ({ sourceEventId: item.reading.sourceEventId, severity: item.assessment.severity })) };
  });
}

async function getDemoManagerUnlocked() {
  const [user] = await db.select().from(users).where(eq(users.email, DEMO_MANAGER_EMAIL)).limit(1);
  return user ?? ensureDemoManager();
}

export function getDemoManager() {
  return withDemoMutationLock(() => getDemoManagerUnlocked());
}
