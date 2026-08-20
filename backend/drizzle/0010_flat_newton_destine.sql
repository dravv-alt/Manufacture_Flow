CREATE TYPE "public"."procurement_automation_outcome" AS ENUM('requisition_created', 'no_eligible_vendor');--> statement-breakpoint
CREATE TYPE "public"."vendor_notification_state" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "procurement_automation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_recovery_result_id" uuid NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"selected_vendor_id" uuid,
	"procurement_request_id" uuid,
	"correlation_id" varchar(160) NOT NULL,
	"outcome" "procurement_automation_outcome" NOT NULL,
	"ranked_options" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procurement_automation_results_resource_recovery_result_id_unique" UNIQUE("resource_recovery_result_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procurement_request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"recipient_email" varchar(320) NOT NULL,
	"cc_roles" jsonb NOT NULL,
	"body" text NOT NULL,
	"state" "vendor_notification_state" DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_notifications_procurement_request_id_unique" UNIQUE("procurement_request_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_part_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"lead_time_hours" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"reliability_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"contact_email" varchar(320) NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "procurement_automation_results" ADD CONSTRAINT "procurement_automation_results_resource_recovery_result_id_resource_recovery_results_id_fk" FOREIGN KEY ("resource_recovery_result_id") REFERENCES "public"."resource_recovery_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_automation_results" ADD CONSTRAINT "procurement_automation_results_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_automation_results" ADD CONSTRAINT "procurement_automation_results_selected_vendor_id_vendors_id_fk" FOREIGN KEY ("selected_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_automation_results" ADD CONSTRAINT "procurement_automation_results_procurement_request_id_procurement_requests_id_fk" FOREIGN KEY ("procurement_request_id") REFERENCES "public"."procurement_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_procurement_request_id_procurement_requests_id_fk" FOREIGN KEY ("procurement_request_id") REFERENCES "public"."procurement_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_part_capabilities" ADD CONSTRAINT "vendor_part_capabilities_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_part_capabilities" ADD CONSTRAINT "vendor_part_capabilities_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "procurement_automation_results_case_idx" ON "procurement_automation_results" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "vendor_notifications_vendor_state_idx" ON "vendor_notifications" USING btree ("vendor_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_part_capability_idx" ON "vendor_part_capabilities" USING btree ("vendor_id","part_id");--> statement-breakpoint
CREATE INDEX "vendor_part_capabilities_part_idx" ON "vendor_part_capabilities" USING btree ("part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "procurement_requests_case_part_idx" ON "procurement_requests" USING btree ("failure_case_id","part_id");