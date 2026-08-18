CREATE TYPE "public"."inventory_state" AS ENUM('available', 'unavailable', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."notification_state" AS ENUM('unread', 'acknowledged', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_state" AS ENUM('draft', 'approved', 'executed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."procurement_state" AS ENUM('draft', 'sent', 'acknowledged', 'delayed');--> statement-breakpoint
CREATE TYPE "public"."failure_severity" AS ENUM('critical', 'warning');--> statement-breakpoint
CREATE TYPE "public"."shipment_state" AS ENUM('original', 'revised', 'notification_pending', 'notified', 'failed');--> statement-breakpoint
CREATE TABLE "failure_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"workstation_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"severity" "failure_severity" NOT NULL,
	"component" varchar(200) NOT NULL,
	"probability" integer NOT NULL,
	"ttf_hours" integer NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"workflow_state" varchar(96) NOT NULL,
	"owner_role" varchar(96) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "failure_cases_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"location" varchar(120) NOT NULL,
	"on_hand" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"state" "inventory_state" DEFAULT 'available' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"actor" varchar(120) NOT NULL,
	"status" varchar(64) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"workstation_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"assignee" varchar(160) NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"scenario" varchar(64) DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_work_orders_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"recipient_role" varchar(96) NOT NULL,
	"channel" varchar(64) NOT NULL,
	"subject" varchar(240) NOT NULL,
	"state" "notification_state" DEFAULT 'unread' NOT NULL,
	"delivered_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"unit" varchar(32) DEFAULT 'unit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "procurement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"vendor" varchar(200) NOT NULL,
	"state" "procurement_state" DEFAULT 'draft' NOT NULL,
	"required_by" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procurement_requests_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "reroute_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"source_workstation_id" uuid NOT NULL,
	"target_workstation_id" uuid NOT NULL,
	"affected_jobs" jsonb NOT NULL,
	"state" "plan_state" DEFAULT 'draft' NOT NULL,
	"approved_by" varchar(120),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_impacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"original_eta" timestamp with time zone NOT NULL,
	"revised_eta" timestamp with time zone NOT NULL,
	"delta_hours" integer NOT NULL,
	"state" "shipment_state" DEFAULT 'revised' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_impacts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"actor" varchar(120) NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workstations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"line" varchar(64) NOT NULL,
	"status" varchar(64) NOT NULL,
	"capacity_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workstations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "failure_cases" ADD CONSTRAINT "failure_cases_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_cases" ADD CONSTRAINT "failure_cases_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reroute_plans" ADD CONSTRAINT "reroute_plans_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reroute_plans" ADD CONSTRAINT "reroute_plans_source_workstation_id_workstations_id_fk" FOREIGN KEY ("source_workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reroute_plans" ADD CONSTRAINT "reroute_plans_target_workstation_id_workstations_id_fk" FOREIGN KEY ("target_workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD CONSTRAINT "shipment_impacts_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workstations" ADD CONSTRAINT "workstations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "failure_cases_workstation_idx" ON "failure_cases" USING btree ("workstation_id");--> statement-breakpoint
CREATE INDEX "failure_cases_state_idx" ON "failure_cases" USING btree ("workflow_state");--> statement-breakpoint
CREATE INDEX "inventory_part_plant_idx" ON "inventory_items" USING btree ("part_id","plant_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_case_idx" ON "inventory_reservations" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "notifications_case_state_idx" ON "notifications" USING btree ("failure_case_id","state");--> statement-breakpoint
CREATE INDEX "reroute_plans_case_idx" ON "reroute_plans" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "workflow_events_case_time_idx" ON "workflow_events" USING btree ("failure_case_id","occurred_at");--> statement-breakpoint
CREATE INDEX "workstations_plant_idx" ON "workstations" USING btree ("plant_id");