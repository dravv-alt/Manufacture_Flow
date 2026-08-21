import { and, eq } from "drizzle-orm";
import { fileURLToPath } from "url";
import { resolve } from "path";
import postgres from "postgres";
import { db, queryClient } from "../src/lib/db/client";
import { failureCases, inventoryItems, maintenanceWorkOrders, notifications, parts, plants, procurementRequests, reroutePlans, shipmentImpacts, users, vendorPartCapabilities, vendors, workflowEvents, workstations } from "../src/lib/db/schema";
import { liveDatabaseUrl } from "../src/lib/runtime/config";
import { seedSimulatedTelemetry } from "../src/lib/telemetry/simulator";

async function one<T>(rows: T[], message: string) {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

async function seedUnlocked() {
  const localPasswordHash = await bcrypt.hash("MachineOverwatch!2026", 12);
  await db.insert(users).values([
    { email: "manager@northfab.local", displayName: "Plant Manager", role: "Plant Manager", passwordHash: localPasswordHash },
    { email: "maintenance@northfab.local", displayName: "A. Kulkarni", role: "Maintenance Lead", passwordHash: localPasswordHash },
    { email: "procurement@northfab.local", displayName: "Sarah Jenkins", role: "Procurement Team", passwordHash: localPasswordHash },
    { email: "logistics@northfab.local", displayName: "Logistics Desk", role: "Logistics Team", passwordHash: localPasswordHash },
  ]).onConflictDoNothing();
  await db.insert(plants).values({ code: "NORTH-FAB", name: "North Fabrication Plant", timezone: "Asia/Kolkata" }).onConflictDoNothing();
  const plant = await one(await db.select().from(plants).where(eq(plants.code, "NORTH-FAB")), "Plant seed missing.");

  await db.insert(workstations).values([
    { plantId: plant.id, code: "WS-102", name: "CNC Lathe Alpha", line: "L-03", status: "At Risk", capacityPercent: 45 },
    { plantId: plant.id, code: "WS-105", name: "CNC Lathe Delta", line: "L-03", status: "Operational", capacityPercent: 45 },
    { plantId: plant.id, code: "WS-108", name: "Robotic Arm Beta", line: "L-01", status: "At Risk", capacityPercent: 55 },
    { plantId: plant.id, code: "WS-112", name: "Conveyor Line Gamma", line: "L-04", status: "Operational", capacityPercent: 88 },
  ]).onConflictDoNothing();
  await seedSimulatedTelemetry("seed-v1");

  await db.insert(parts).values([
    { code: "BRG-10023", name: "Servo Motor Bearing", unit: "unit" },
    { code: "ACT-2218", name: "Actuator Joint B", unit: "unit" },
  ]).onConflictDoNothing();

  const ws102 = await one(await db.select().from(workstations).where(eq(workstations.code, "WS-102")), "WS-102 seed missing.");
  const ws105 = await one(await db.select().from(workstations).where(eq(workstations.code, "WS-105")), "WS-105 seed missing.");
  const bearing = await one(await db.select().from(parts).where(eq(parts.code, "BRG-10023")), "BRG-10023 seed missing.");
  await db.insert(vendors).values({ name: "Apex Motion Components", contactEmail: "recovery@apexmotion.local", approved: true, active: true }).onConflictDoNothing();
  const apex = await one(await db.select().from(vendors).where(eq(vendors.name, "Apex Motion Components")), "Apex vendor seed missing.");
  await db.insert(vendorPartCapabilities).values({ vendorId: apex.id, partId: bearing.id, active: true, leadTimeHours: 8, unitCostCents: 425000, reliabilityScore: 96 }).onConflictDoNothing();

  await db.insert(failureCases).values({ externalId: "FC-2026-0047", workstationId: ws102.id, partId: bearing.id, severity: "critical", component: "X-Axis Servo Motor Bearing", probability: 92, ttfHours: 18, detectedAt: new Date("2026-08-10T03:14:00+05:30"), workflowState: "Recovery plan review", ownerRole: "Production Supervisor" }).onConflictDoNothing();
  const failureCase = await one(await db.select().from(failureCases).where(eq(failureCases.externalId, "FC-2026-0047")), "Failure case seed missing.");

  const [seedInventory] = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(
    eq(inventoryItems.partId, bearing.id),
    eq(inventoryItems.plantId, plant.id),
    eq(inventoryItems.location, "WH-A / Rack B-14"),
  )).limit(1);
  if (!seedInventory) await db.insert(inventoryItems).values({ partId: bearing.id, plantId: plant.id, location: "WH-A / Rack B-14", onHand: 3, reserved: 0, state: "available" });

  const [seedReroutePlan] = await db.select({ id: reroutePlans.id }).from(reroutePlans).where(and(
    eq(reroutePlans.failureCaseId, failureCase.id),
    eq(reroutePlans.sourceWorkstationId, ws102.id),
    eq(reroutePlans.targetWorkstationId, ws105.id),
    eq(reroutePlans.state, "draft"),
  )).limit(1);
  if (!seedReroutePlan) await db.insert(reroutePlans).values({ failureCaseId: failureCase.id, sourceWorkstationId: ws102.id, targetWorkstationId: ws105.id, affectedJobs: ["J1001", "J1002", "J1003"], state: "draft" });
  await db.insert(procurementRequests).values({ externalId: "PR-10023-DRAFT", failureCaseId: failureCase.id, partId: bearing.id, quantity: 1, vendor: "Apex Motion Components", state: "draft", requiredBy: new Date("2026-08-10T06:00:00+05:30") }).onConflictDoNothing();
  await db.insert(maintenanceWorkOrders).values({ externalId: "WO-WS102-081", failureCaseId: failureCase.id, workstationId: ws102.id, partId: bearing.id, assignee: "A. Kulkarni / Maintenance Lead", stage: 3, scenario: "local" }).onConflictDoNothing();
  await db.insert(shipmentImpacts).values({ externalId: "SO-8841", failureCaseId: failureCase.id, originalEta: new Date("2026-08-09T18:00:00+05:30"), revisedEta: new Date("2026-08-10T18:00:00+05:30"), deltaHours: 6, state: "revised" }).onConflictDoNothing();
  const notificationSeeds = [
    { recipientRole: "Maintenance Lead", subject: "WS-102 bearing recovery requires review" },
    { recipientRole: "Logistics Team", subject: "SO-8841 commitment revised by 6 hours" },
  ];
  for (const notification of notificationSeeds) {
    const [existing] = await db.select({ id: notifications.id }).from(notifications).where(and(
      eq(notifications.failureCaseId, failureCase.id),
      eq(notifications.recipientRole, notification.recipientRole),
      eq(notifications.subject, notification.subject),
    )).limit(1);
    if (!existing) await db.insert(notifications).values({ failureCaseId: failureCase.id, channel: "in_app", state: "unread", ...notification });
  }

  const events = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id));
  if (events.length === 0) {
    await db.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "failure_case", entityId: failureCase.id, eventType: "failure_case_detected", actor: "Predictive Monitoring Service", payload: { probability: 92, ttfHours: 18, partCode: bearing.code } });
  }

  console.log("Seed complete: FC-2026-0047, BRG-10023, WO-WS102-081, and SO-8841 are ready.");
}

export async function seed() {
  const lockClient = postgres(liveDatabaseUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    await lockClient`select pg_advisory_lock(hashtext('manufacture-flow:seed-live'))`;
    await seedUnlocked();
  } finally {
    try { await lockClient`select pg_advisory_unlock(hashtext('manufacture-flow:seed-live'))`; } catch { /* connection cleanup still runs */ }
    await lockClient.end({ timeout: 5 });
  }
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedAsScript && process.env.SEED_DB_IMPORT_ONLY !== "1") seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await queryClient.end({ timeout: 5 }); });
import bcrypt from "bcryptjs";
