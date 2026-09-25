ALTER TABLE "reroute_decisions" DROP CONSTRAINT IF EXISTS "reroute_decisions_production_job_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reroute_decisions_job_correlation_idx" ON "reroute_decisions" USING btree ("production_job_id", "correlation_id");
