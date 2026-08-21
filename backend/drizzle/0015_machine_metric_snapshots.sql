CREATE TABLE "machine_metric_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workstation_id" uuid NOT NULL REFERENCES "workstations"("id") ON DELETE restrict,
  "telemetry_reading_id" uuid NOT NULL REFERENCES "telemetry_readings"("id") ON DELETE restrict,
  "source_event_id" varchar(128) NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "power_kw" double precision NOT NULL,
  "availability_percent" double precision NOT NULL,
  "performance_percent" double precision NOT NULL,
  "quality_percent" double precision NOT NULL,
  "oee_percent" double precision NOT NULL,
  "cycle_time_seconds" double precision NOT NULL,
  "output_per_hour" integer NOT NULL,
  "defect_rate_percent" double precision NOT NULL,
  "estimated_rul_days" integer NOT NULL,
  "operator_id" varchar(64) NOT NULL,
  "firmware_version" varchar(64) NOT NULL,
  "network_ping_ms" integer NOT NULL
);
CREATE UNIQUE INDEX "machine_metric_snapshots_source_event_idx" ON "machine_metric_snapshots" USING btree ("source_event_id");
CREATE UNIQUE INDEX "machine_metric_snapshots_telemetry_idx" ON "machine_metric_snapshots" USING btree ("telemetry_reading_id");
CREATE INDEX "machine_metric_snapshots_station_observed_idx" ON "machine_metric_snapshots" USING btree ("workstation_id", "observed_at");
