CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."telemetry_anomaly_severity" AS ENUM('none', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" varchar(120) NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"workstation_id" uuid,
	"source_event_id" varchar(128),
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "telemetry_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workstation_id" uuid NOT NULL,
	"source_event_id" varchar(128) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"temperature_celsius" double precision NOT NULL,
	"vibration_mm_per_second" double precision NOT NULL,
	"pressure_bar" double precision NOT NULL,
	"cycle_count" integer NOT NULL,
	"motor_current_amps" double precision NOT NULL,
	"active_error_codes" jsonb NOT NULL,
	"anomaly_severity" "telemetry_anomaly_severity" NOT NULL,
	"anomaly_reasons" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_workstation_id_workstations_id_fk" FOREIGN KEY ("workstation_id") REFERENCES "public"."workstations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_station_time_idx" ON "agent_runs" USING btree ("workstation_id","started_at");--> statement-breakpoint
CREATE INDEX "agent_runs_source_event_idx" ON "agent_runs" USING btree ("source_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_readings_source_event_idx" ON "telemetry_readings" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "telemetry_readings_station_observed_idx" ON "telemetry_readings" USING btree ("workstation_id","observed_at");