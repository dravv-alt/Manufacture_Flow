import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const severityEnum = pgEnum("failure_severity", ["critical", "warning"]);
export const inventoryStateEnum = pgEnum("inventory_state", ["available", "unavailable", "reserved"]);
export const planStateEnum = pgEnum("plan_state", ["draft", "approved", "executed", "rejected"]);
export const procurementStateEnum = pgEnum("procurement_state", ["draft", "sent", "acknowledged", "delayed"]);
export const shipmentStateEnum = pgEnum("shipment_state", ["original", "revised", "notification_pending", "notified", "failed"]);
export const notificationStateEnum = pgEnum("notification_state", ["unread", "acknowledged", "failed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const plants = pgTable("plants", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
  ...timestamps,
});

export const workstations = pgTable("workstations", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id").notNull().references(() => plants.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  line: varchar("line", { length: 64 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  capacityPercent: integer("capacity_percent").notNull(),
  ...timestamps,
}, (table) => [index("workstations_plant_idx").on(table.plantId)]);

export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default("unit"),
  ...timestamps,
});

export const failureCases = pgTable("failure_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  severity: severityEnum("severity").notNull(),
  component: varchar("component", { length: 200 }).notNull(),
  probability: integer("probability").notNull(),
  ttfHours: integer("ttf_hours").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  workflowState: varchar("workflow_state", { length: 96 }).notNull(),
  ownerRole: varchar("owner_role", { length: 96 }).notNull(),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [index("failure_cases_workstation_idx").on(table.workstationId), index("failure_cases_state_idx").on(table.workflowState)]);

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  plantId: uuid("plant_id").notNull().references(() => plants.id, { onDelete: "restrict" }),
  location: varchar("location", { length: 120 }).notNull(),
  onHand: integer("on_hand").notNull(),
  reserved: integer("reserved").notNull().default(0),
  state: inventoryStateEnum("state").notNull().default("available"),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [index("inventory_part_plant_idx").on(table.partId, table.plantId)]);

export const inventoryReservations = pgTable("inventory_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "restrict" }),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  actor: varchar("actor", { length: 120 }).notNull(),
  status: varchar("status", { length: 64 }).notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("inventory_reservations_case_idx").on(table.failureCaseId)]);

export const reroutePlans = pgTable("reroute_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  sourceWorkstationId: uuid("source_workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  targetWorkstationId: uuid("target_workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  affectedJobs: jsonb("affected_jobs").notNull().$type<string[]>(),
  state: planStateEnum("state").notNull().default("draft"),
  approvedBy: varchar("approved_by", { length: 120 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("reroute_plans_case_idx").on(table.failureCaseId)]);

export const procurementRequests = pgTable("procurement_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  vendor: varchar("vendor", { length: 200 }).notNull(),
  state: procurementStateEnum("state").notNull().default("draft"),
  requiredBy: timestamp("required_by", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  assignee: varchar("assignee", { length: 160 }).notNull(),
  stage: integer("stage").notNull().default(1),
  scenario: varchar("scenario", { length: 64 }).notNull().default("local"),
  ...timestamps,
});

export const shipmentImpacts = pgTable("shipment_impacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  originalEta: timestamp("original_eta", { withTimezone: true }).notNull(),
  revisedEta: timestamp("revised_eta", { withTimezone: true }).notNull(),
  deltaHours: integer("delta_hours").notNull(),
  state: shipmentStateEnum("state").notNull().default("revised"),
  ...timestamps,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  recipientRole: varchar("recipient_role", { length: 96 }).notNull(),
  channel: varchar("channel", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 240 }).notNull(),
  state: notificationStateEnum("state").notNull().default("unread"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: varchar("acknowledged_by", { length: 120 }),
  ...timestamps,
}, (table) => [index("notifications_case_state_idx").on(table.failureCaseId, table.state)]);

export const workflowEvents = pgTable("workflow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  actor: varchar("actor", { length: 120 }).notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("workflow_events_case_time_idx").on(table.failureCaseId, table.occurredAt)]);
