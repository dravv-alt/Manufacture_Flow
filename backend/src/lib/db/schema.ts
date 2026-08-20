import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const severityEnum = pgEnum("failure_severity", ["critical", "warning"]);
export const inventoryStateEnum = pgEnum("inventory_state", ["available", "unavailable", "reserved"]);
export const planStateEnum = pgEnum("plan_state", ["draft", "approved", "executed", "rejected"]);
export const procurementStateEnum = pgEnum("procurement_state", ["draft", "sent", "acknowledged", "delayed"]);
export const shipmentStateEnum = pgEnum("shipment_state", ["original", "revised", "notification_pending", "notified", "failed"]);
export const notificationStateEnum = pgEnum("notification_state", ["unread", "acknowledged", "failed"]);
export const procurementMessageKindEnum = pgEnum("procurement_message_kind", ["system", "internal_note", "vendor"]);
export const roleEnum = pgEnum("user_role", ["Plant Manager", "Production Supervisor", "Maintenance Lead", "Scheduler", "Warehouse Team", "Procurement Team", "Logistics Team"]);
export const telemetryAnomalySeverityEnum = pgEnum("telemetry_anomaly_severity", ["none", "warning", "critical"]);
export const agentRunStatusEnum = pgEnum("agent_run_status", ["running", "completed", "failed"]);
export const recoveryGraphRunStatusEnum = pgEnum("recovery_graph_run_status", ["running", "completed", "requires_intervention", "failed"]);
export const allocationLockStateEnum = pgEnum("allocation_lock_state", ["active", "released"]);
export const productionJobStateEnum = pgEnum("production_job_state", ["queued", "in_flight", "completed", "cancelled"]);
export const resourceRecoveryOutcomeEnum = pgEnum("resource_recovery_outcome", ["reserved", "procurement_required"]);
export const procurementAutomationOutcomeEnum = pgEnum("procurement_automation_outcome", ["requisition_created", "no_eligible_vendor"]);
export const vendorNotificationStateEnum = pgEnum("vendor_notification_state", ["queued", "sent", "failed"]);

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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  role: roleEnum("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("auth_sessions_user_expiry_idx").on(table.userId, table.expiresAt)]);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex("user_preferences_user_idx").on(table.userId)]);

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

/**
 * Append-only machine observations. `sourceEventId` is the idempotency key
 * supplied by the machine gateway, so a delivery retry cannot create a second
 * observation or a second anomaly decision.
 */
export const telemetryReadings = pgTable("telemetry_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  sourceEventId: varchar("source_event_id", { length: 128 }).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  temperatureCelsius: doublePrecision("temperature_celsius").notNull(),
  vibrationMmPerSecond: doublePrecision("vibration_mm_per_second").notNull(),
  pressureBar: doublePrecision("pressure_bar").notNull(),
  cycleCount: integer("cycle_count").notNull(),
  motorCurrentAmps: doublePrecision("motor_current_amps").notNull(),
  activeErrorCodes: jsonb("active_error_codes").notNull().$type<string[]>(),
  anomalySeverity: telemetryAnomalySeverityEnum("anomaly_severity").notNull(),
  anomalyReasons: jsonb("anomaly_reasons").notNull().$type<string[]>(),
}, (table) => [
  uniqueIndex("telemetry_readings_source_event_idx").on(table.sourceEventId),
  index("telemetry_readings_station_observed_idx").on(table.workstationId, table.observedAt),
]);

/**
 * Immutable execution record for controlled automation. Future agents share
 * this shape, while each agent stores its input/output as structured JSON.
 */
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentName: varchar("agent_name", { length: 120 }).notNull(),
  status: agentRunStatusEnum("status").notNull().default("running"),
  workstationId: uuid("workstation_id").references(() => workstations.id, { onDelete: "restrict" }),
  correlationId: varchar("correlation_id", { length: 160 }),
  sourceEventId: varchar("source_event_id", { length: 128 }),
  input: jsonb("input").notNull().$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("agent_runs_station_time_idx").on(table.workstationId, table.startedAt),
  index("agent_runs_correlation_idx").on(table.correlationId),
  index("agent_runs_source_event_idx").on(table.sourceEventId),
  uniqueIndex("agent_runs_agent_source_event_idx").on(table.agentName, table.sourceEventId),
]);

/** Durable product record for a LangGraph recovery invocation. */
export const recoveryGraphRuns = pgTable("recovery_graph_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  correlationId: varchar("correlation_id", { length: 160 }).notNull().unique(),
  telemetrySourceEventId: varchar("telemetry_source_event_id", { length: 128 }).notNull(),
  status: recoveryGraphRunStatusEnum("status").notNull().default("running"),
  state: jsonb("state").notNull().$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("recovery_graph_runs_telemetry_idx").on(table.telemetrySourceEventId, table.startedAt),
]);

export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default("unit"),
  ...timestamps,
});

/** Controlled supplier master data. Vendor approval is explicit and auditable. */
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  approved: boolean("approved").notNull().default(false),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

/** Approved part-level capabilities and deterministic procurement ranking inputs. */
export const vendorPartCapabilities = pgTable("vendor_part_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  active: boolean("active").notNull().default(true),
  leadTimeHours: integer("lead_time_hours").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  reliabilityScore: integer("reliability_score").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("vendor_part_capability_idx").on(table.vendorId, table.partId),
  index("vendor_part_capabilities_part_idx").on(table.partId),
]);

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

/**
 * A controlled prediction is a durable decision made from exactly one
 * telemetry observation. A real ML provider can later replace the provider
 * implementation without changing this audit and workflow boundary.
 */
export const failurePredictions = pgTable("failure_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  telemetryReadingId: uuid("telemetry_reading_id").notNull().references(() => telemetryReadings.id, { onDelete: "restrict" }),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  component: varchar("component", { length: 200 }).notNull(),
  severity: severityEnum("severity").notNull(),
  probability: integer("probability").notNull(),
  ttfHours: integer("ttf_hours").notNull(),
  providerName: varchar("provider_name", { length: 120 }).notNull(),
  providerVersion: varchar("provider_version", { length: 64 }).notNull(),
  rationale: jsonb("rationale").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("failure_predictions_telemetry_reading_idx").on(table.telemetryReadingId),
  index("failure_predictions_case_time_idx").on(table.failureCaseId, table.createdAt),
  index("failure_predictions_workstation_time_idx").on(table.workstationId, table.createdAt),
]);

/** An authoritative server-side block on assigning new production work to one workstation. */
export const workstationAllocationLocks = pgTable("workstation_allocation_locks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }).unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  failurePredictionId: uuid("failure_prediction_id").notNull().references(() => failurePredictions.id, { onDelete: "restrict" }),
  correlationId: varchar("correlation_id", { length: 160 }).notNull(),
  state: allocationLockStateEnum("state").notNull().default("active"),
  policyDisposition: varchar("policy_disposition", { length: 64 }).notNull(),
  reason: text("reason").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("allocation_locks_case_idx").on(table.failureCaseId),
  index("allocation_locks_prediction_idx").on(table.failurePredictionId),
]);

/** Persisted production work is the only supported server-side assignment boundary. */
export const productionJobs = pgTable("production_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  state: productionJobStateEnum("state").notNull().default("queued"),
  rerouteEvaluationRequired: boolean("reroute_evaluation_required").notNull().default(false),
  rerouteEvaluationReason: text("reroute_evaluation_reason"),
  ...timestamps,
}, (table) => [
  index("production_jobs_station_state_idx").on(table.workstationId, table.state),
  index("production_jobs_reroute_evaluation_idx").on(table.rerouteEvaluationRequired),
]);

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

/** Durable agent outcome: either a concrete reservation or an explicit procurement-required handoff. */
export const resourceRecoveryResults = pgTable("resource_recovery_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  failurePredictionId: uuid("failure_prediction_id").notNull().references(() => failurePredictions.id, { onDelete: "restrict" }).unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, { onDelete: "restrict" }),
  inventoryReservationId: uuid("inventory_reservation_id").references(() => inventoryReservations.id, { onDelete: "restrict" }),
  correlationId: varchar("correlation_id", { length: 160 }).notNull(),
  outcome: resourceRecoveryOutcomeEnum("outcome").notNull(),
  requiredQuantity: integer("required_quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
  reason: text("reason").notNull(),
  ...timestamps,
}, (table) => [
  index("resource_recovery_results_case_idx").on(table.failureCaseId),
  index("resource_recovery_results_correlation_idx").on(table.correlationId),
]);

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
}, (table) => [uniqueIndex("procurement_requests_case_part_idx").on(table.failureCaseId, table.partId)]);

/** Durable procurement decision from one procurement-required resource recovery result. */
export const procurementAutomationResults = pgTable("procurement_automation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceRecoveryResultId: uuid("resource_recovery_result_id").notNull().references(() => resourceRecoveryResults.id, { onDelete: "restrict" }).unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  selectedVendorId: uuid("selected_vendor_id").references(() => vendors.id, { onDelete: "restrict" }),
  procurementRequestId: uuid("procurement_request_id").references(() => procurementRequests.id, { onDelete: "restrict" }),
  correlationId: varchar("correlation_id", { length: 160 }).notNull(),
  outcome: procurementAutomationOutcomeEnum("outcome").notNull(),
  rankedOptions: jsonb("ranked_options").notNull().$type<Array<{ vendorId: string; vendorName: string; leadTimeHours: number; unitCostCents: number; reliabilityScore: number }>>(),
  reason: text("reason").notNull(),
  ...timestamps,
}, (table) => [index("procurement_automation_results_case_idx").on(table.failureCaseId)]);

/** Controlled vendor handoff record. It is queued for delivery; no external dispatch is performed in this slice. */
export const vendorNotifications = pgTable("vendor_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  procurementRequestId: uuid("procurement_request_id").notNull().references(() => procurementRequests.id, { onDelete: "cascade" }).unique(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  ccRoles: jsonb("cc_roles").notNull().$type<string[]>(),
  body: text("body").notNull(),
  state: vendorNotificationStateEnum("state").notNull().default("queued"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("vendor_notifications_vendor_state_idx").on(table.vendorId, table.state)]);

export const procurementMessages = pgTable("procurement_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  procurementRequestId: uuid("procurement_request_id").notNull().references(() => procurementRequests.id, { onDelete: "cascade" }),
  kind: procurementMessageKindEnum("kind").notNull(),
  body: text("body").notNull(),
  actor: varchar("actor", { length: 120 }).notNull(),
  ...timestamps,
}, (table) => [index("procurement_messages_request_time_idx").on(table.procurementRequestId, table.createdAt)]);

export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 64 }).notNull().unique(),
  failureCaseId: uuid("failure_case_id").notNull().references(() => failureCases.id, { onDelete: "restrict" }),
  workstationId: uuid("workstation_id").notNull().references(() => workstations.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull().references(() => parts.id, { onDelete: "restrict" }),
  assignee: varchar("assignee", { length: 160 }).notNull(),
  priority: varchar("priority", { length: 32 }),
  diagnosis: text("diagnosis"),
  resourceRecoveryResultId: uuid("resource_recovery_result_id").references(() => resourceRecoveryResults.id, { onDelete: "restrict" }).unique(),
  procurementAutomationResultId: uuid("procurement_automation_result_id").references(() => procurementAutomationResults.id, { onDelete: "restrict" }),
  plannedWindowStart: timestamp("planned_window_start", { withTimezone: true }),
  plannedWindowEnd: timestamp("planned_window_end", { withTimezone: true }),
  checklist: jsonb("checklist").$type<string[]>(),
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
  failurePredictionId: uuid("failure_prediction_id").references(() => failurePredictions.id, { onDelete: "restrict" }),
  recipientRole: varchar("recipient_role", { length: 96 }).notNull(),
  channel: varchar("channel", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 240 }).notNull(),
  state: notificationStateEnum("state").notNull().default("unread"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: varchar("acknowledged_by", { length: 120 }),
  ...timestamps,
}, (table) => [
  index("notifications_case_state_idx").on(table.failureCaseId, table.state),
  index("notifications_prediction_idx").on(table.failurePredictionId),
  uniqueIndex("notifications_prediction_recipient_idx").on(table.failurePredictionId, table.recipientRole),
]);

export const notificationAttempts = pgTable("notification_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  state: notificationStateEnum("state").notNull(),
  channel: varchar("channel", { length: 64 }).notNull(),
  actor: varchar("actor", { length: 120 }).notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("notification_attempt_number_idx").on(table.notificationId, table.attemptNumber), index("notification_attempts_notification_time_idx").on(table.notificationId, table.occurredAt)]);

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
