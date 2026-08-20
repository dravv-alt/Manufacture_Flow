CREATE TABLE "recovery_time_estimates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "failure_case_id" uuid NOT NULL,
  "maintenance_work_order_id" uuid NOT NULL,
  "correlation_id" varchar(160) NOT NULL,
  "revision" integer NOT NULL,
  "scenario" varchar(64) NOT NULL,
  "calculation_version" varchar(64) NOT NULL,
  "input_hash" varchar(64) NOT NULL,
  "calculation_inputs" jsonb NOT NULL,
  "expected_recovery_at" timestamp with time zone NOT NULL,
  "duration_minutes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "recovery_time_estimates_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "recovery_time_estimates_maintenance_work_order_id_maintenance_work_orders_id_fk" FOREIGN KEY ("maintenance_work_order_id") REFERENCES "public"."maintenance_work_orders"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "recovery_time_estimates_work_order_input_idx" UNIQUE("maintenance_work_order_id", "input_hash"),
  CONSTRAINT "recovery_time_estimates_work_order_revision_idx" UNIQUE("maintenance_work_order_id", "revision")
);
--> statement-breakpoint
CREATE INDEX "recovery_time_estimates_case_time_idx" ON "recovery_time_estimates" USING btree ("failure_case_id", "created_at");
--> statement-breakpoint
CREATE INDEX "recovery_time_estimates_correlation_idx" ON "recovery_time_estimates" USING btree ("correlation_id");
