import { eq } from "drizzle-orm";
import { db, queryClient } from "../src/lib/db/client";
import { failureCases, inventoryItems, maintenanceWorkOrders, notifications, parts, plants, procurementRequests, reroutePlans, shipmentImpacts, users, workflowEvents, workstations } from "../src/lib/db/schema";

async function one<T>(rows: T[], message: string) {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

async function seed() {
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

  await db.insert(parts).values([
    { code: "BRG-10023", name: "Servo Motor Bearing", unit: "unit" },
    { code: "ACT-2218", name: "Actuator Joint B", unit: "unit" },
  ]).onConflictDoNothing();

  const ws102 = await one(await db.select().from(workstations).where(eq(workstations.code, "WS-102")), "WS-102 seed missing.");
  const ws105 = await one(await db.select().from(workstations).where(eq(workstations.code, "WS-105")), "WS-105 seed missing.");
  const bearing = await one(await db.select().from(parts).where(eq(parts.code, "BRG-10023")), "BRG-10023 seed missing.");

  await db.insert(failureCases).values({ externalId: "FC-2026-0047", workstationId: ws102.id, partId: bearing.id, severity: "critical", component: "X-Axis Servo Motor Bearing", probability: 92, ttfHours: 18, detectedAt: new Date("2026-08-10T03:14:00+05:30"), workflowState: "Recovery plan review", ownerRole: "Production Supervisor" }).onConflictDoNothing();
  const failureCase = await one(await db.select().from(failureCases).where(eq(failureCases.externalId, "FC-2026-0047")), "Failure case seed missing.");

  await db.insert(inventoryItems).values({ partId: bearing.id, plantId: plant.id, location: "WH-A / Rack B-14", onHand: 3, reserved: 0, state: "available" }).onConflictDoNothing();
  await db.insert(reroutePlans).values({ failureCaseId: failureCase.id, sourceWorkstationId: ws102.id, targetWorkstationId: ws105.id, affectedJobs: ["J1001", "J1002", "J1003"], state: "draft" }).onConflictDoNothing();
  await db.insert(procurementRequests).values({ externalId: "PR-10023-DRAFT", failureCaseId: failureCase.id, partId: bearing.id, quantity: 1, vendor: "Apex Motion Components", state: "draft", requiredBy: new Date("2026-08-10T06:00:00+05:30") }).onConflictDoNothing();
  await db.insert(maintenanceWorkOrders).values({ externalId: "WO-WS102-081", failureCaseId: failureCase.id, workstationId: ws102.id, partId: bearing.id, assignee: "A. Kulkarni / Maintenance Lead", stage: 3, scenario: "local" }).onConflictDoNothing();
  await db.insert(shipmentImpacts).values({ externalId: "SO-8841", failureCaseId: failureCase.id, originalEta: new Date("2026-08-09T18:00:00+05:30"), revisedEta: new Date("2026-08-10T18:00:00+05:30"), deltaHours: 6, state: "revised" }).onConflictDoNothing();
  await db.insert(notifications).values([
    { failureCaseId: failureCase.id, recipientRole: "Maintenance Lead", channel: "in_app", subject: "WS-102 bearing recovery requires review", state: "unread" },
    { failureCaseId: failureCase.id, recipientRole: "Logistics Team", channel: "in_app", subject: "SO-8841 commitment revised by 6 hours", state: "unread" },
  ]).onConflictDoNothing();

  const events = await db.select().from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id));
  if (events.length === 0) {
    await db.insert(workflowEvents).values({ failureCaseId: failureCase.id, entityType: "failure_case", entityId: failureCase.id, eventType: "failure_case_detected", actor: "Predictive Monitoring Service", payload: { probability: 92, ttfHours: 18, partCode: bearing.code } });
  }

  console.log("Seed complete: FC-2026-0047, BRG-10023, WO-WS102-081, and SO-8841 are ready.");
}

seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await queryClient.end({ timeout: 5 }); });
import bcrypt from "bcryptjs";
