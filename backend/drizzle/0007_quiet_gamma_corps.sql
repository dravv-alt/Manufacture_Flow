CREATE TYPE "public"."recovery_graph_run_status" AS ENUM('running', 'completed', 'requires_intervention', 'failed');--> statement-breakpoint
CREATE TABLE "recovery_graph_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" varchar(160) NOT NULL,
	"telemetry_source_event_id" varchar(128) NOT NULL,
	"status" "recovery_graph_run_status" DEFAULT 'running' NOT NULL,
	"state" jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "recovery_graph_runs_correlation_id_unique" UNIQUE("correlation_id")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "correlation_id" varchar(160);--> statement-breakpoint
CREATE INDEX "recovery_graph_runs_telemetry_idx" ON "recovery_graph_runs" USING btree ("telemetry_source_event_id","started_at");--> statement-breakpoint
CREATE INDEX "agent_runs_correlation_idx" ON "agent_runs" USING btree ("correlation_id");