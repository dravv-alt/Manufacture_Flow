CREATE TYPE "public"."allocation_lock_state" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TYPE "public"."production_job_state" AS ENUM('queued', 'in_flight', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "production_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"workstation_id" uuid NOT NULL,
	"state" "production_job_state" DEFAULT 'queued' NOT NULL,
	"reroute_evaluation_required" boolean DEFAULT false NOT NULL,
	"reroute_evaluation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_jobs_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "workstation_allocation_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workstation_id" uuid NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"failure_prediction_id" uuid NOT NULL,
	"correlation_id" varchar(160) NOT NULL,
	"state" "allocation_lock_state" DEFAULT 'active' NOT NULL,
	"policy_disposition" varchar(64) NOT NULL,
	"reason" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workstation_allocation_locks_workstation_id_unique" UNIQUE("workstation_id")
);
--> statement-breakpoint
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workstation_allocation_locks" ADD CONSTRAINT "workstation_allocation_locks_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workstation_allocation_locks" ADD CONSTRAINT "workstation_allocation_locks_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workstation_allocation_locks" ADD CONSTRAINT "workstation_allocation_locks_failure_prediction_id_failure_predictions_id_fk" FOREIGN KEY ("failure_prediction_id") REFERENCES "public"."failure_predictions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_jobs_station_state_idx" ON "production_jobs" USING btree ("workstation_id","state");--> statement-breakpoint
CREATE INDEX "production_jobs_reroute_evaluation_idx" ON "production_jobs" USING btree ("reroute_evaluation_required");--> statement-breakpoint
CREATE INDEX "allocation_locks_case_idx" ON "workstation_allocation_locks" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "allocation_locks_prediction_idx" ON "workstation_allocation_locks" USING btree ("failure_prediction_id");