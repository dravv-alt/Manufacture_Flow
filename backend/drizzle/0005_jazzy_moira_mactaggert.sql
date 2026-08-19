CREATE TABLE "failure_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telemetry_reading_id" uuid NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"workstation_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"component" varchar(200) NOT NULL,
	"severity" "failure_severity" NOT NULL,
	"probability" integer NOT NULL,
	"ttf_hours" integer NOT NULL,
	"provider_name" varchar(120) NOT NULL,
	"provider_version" varchar(64) NOT NULL,
	"rationale" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "failure_predictions" ADD CONSTRAINT "failure_predictions_telemetry_reading_id_telemetry_readings_id_fk" FOREIGN KEY ("telemetry_reading_id") REFERENCES "public"."telemetry_readings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_predictions" ADD CONSTRAINT "failure_predictions_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_predictions" ADD CONSTRAINT "failure_predictions_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_predictions" ADD CONSTRAINT "failure_predictions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "failure_predictions_telemetry_reading_idx" ON "failure_predictions" USING btree ("telemetry_reading_id");--> statement-breakpoint
CREATE INDEX "failure_predictions_case_time_idx" ON "failure_predictions" USING btree ("failure_case_id","created_at");--> statement-breakpoint
CREATE INDEX "failure_predictions_workstation_time_idx" ON "failure_predictions" USING btree ("workstation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_runs_agent_source_event_idx" ON "agent_runs" USING btree ("agent_name","source_event_id");