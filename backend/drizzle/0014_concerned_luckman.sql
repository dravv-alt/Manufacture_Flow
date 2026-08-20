CREATE TYPE "public"."delivery_impact_classification" AS ENUM('ON_TIME', 'AT_RISK', 'DELAYED');--> statement-breakpoint
CREATE TABLE "shipment_commitments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "external_id" varchar(64) NOT NULL,
  "production_job_ids" jsonb NOT NULL,
  "original_committed_at" timestamp with time zone NOT NULL,
  "post_completion_minutes" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shipment_commitments_external_id_unique" UNIQUE("external_id")
);--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "correlation_id" varchar(160);--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "recovery_time_estimate_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "shipment_commitment_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "reroute_decision_ids" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "reroute_plan_ids" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "affected_job_ids" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "original_committed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "revised_projected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "classification" "delivery_impact_classification";--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "delay_minutes" integer;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD COLUMN "rationale" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD CONSTRAINT "shipment_impacts_recovery_time_estimate_id_recovery_time_estimates_id_fk" FOREIGN KEY ("recovery_time_estimate_id") REFERENCES "public"."recovery_time_estimates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_impacts" ADD CONSTRAINT "shipment_impacts_shipment_commitment_id_shipment_commitments_id_fk" FOREIGN KEY ("shipment_commitment_id") REFERENCES "public"."shipment_commitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_commitments_active_idx" ON "shipment_commitments" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_impacts_correlation_commitment_idx" ON "shipment_impacts" USING btree ("correlation_id","shipment_commitment_id");--> statement-breakpoint
CREATE INDEX "shipment_impacts_correlation_idx" ON "shipment_impacts" USING btree ("correlation_id");
