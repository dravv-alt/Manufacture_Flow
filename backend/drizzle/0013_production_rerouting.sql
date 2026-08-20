ALTER TABLE "production_jobs" ADD COLUMN "operation_code" varchar(64) DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD COLUMN "tooling_code" varchar(64) DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD COLUMN "required_skill" varchar(64) DEFAULT 'OPERATOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD COLUMN "estimated_load_percent" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE TABLE "workstation_capabilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workstation_id" uuid NOT NULL,
  "operation_code" varchar(64) NOT NULL,
  "tooling_code" varchar(64) NOT NULL,
  "qualified_skill" varchar(64) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "workstation_capabilities_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "workstation_capability_match_idx" UNIQUE("workstation_id", "operation_code", "tooling_code", "qualified_skill")
);--> statement-breakpoint
CREATE INDEX "workstation_capability_operation_idx" ON "workstation_capabilities" USING btree ("operation_code");--> statement-breakpoint
CREATE TABLE "reroute_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "failure_case_id" uuid NOT NULL,
  "production_job_id" uuid NOT NULL,
  "source_workstation_id" uuid NOT NULL,
  "target_workstation_id" uuid,
  "correlation_id" varchar(160) NOT NULL,
  "outcome" varchar(64) NOT NULL,
  "rationale" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reroute_decisions_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "reroute_decisions_production_job_id_production_jobs_id_fk" FOREIGN KEY ("production_job_id") REFERENCES "public"."production_jobs"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "reroute_decisions_source_workstation_id_workstations_id_fk" FOREIGN KEY ("source_workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "reroute_decisions_target_workstation_id_workstations_id_fk" FOREIGN KEY ("target_workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "reroute_decisions_production_job_id_unique" UNIQUE("production_job_id")
);--> statement-breakpoint
CREATE INDEX "reroute_decisions_case_idx" ON "reroute_decisions" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "reroute_decisions_correlation_idx" ON "reroute_decisions" USING btree ("correlation_id");
