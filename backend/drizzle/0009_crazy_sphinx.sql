CREATE TYPE "public"."resource_recovery_outcome" AS ENUM('reserved', 'procurement_required');--> statement-breakpoint
CREATE TABLE "resource_recovery_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_prediction_id" uuid NOT NULL,
	"failure_case_id" uuid NOT NULL,
	"inventory_item_id" uuid,
	"inventory_reservation_id" uuid,
	"correlation_id" varchar(160) NOT NULL,
	"outcome" "resource_recovery_outcome" NOT NULL,
	"required_quantity" integer NOT NULL,
	"available_quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_recovery_results_failure_prediction_id_unique" UNIQUE("failure_prediction_id")
);
--> statement-breakpoint
ALTER TABLE "resource_recovery_results" ADD CONSTRAINT "resource_recovery_results_failure_prediction_id_failure_predictions_id_fk" FOREIGN KEY ("failure_prediction_id") REFERENCES "public"."failure_predictions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_recovery_results" ADD CONSTRAINT "resource_recovery_results_failure_case_id_failure_cases_id_fk" FOREIGN KEY ("failure_case_id") REFERENCES "public"."failure_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_recovery_results" ADD CONSTRAINT "resource_recovery_results_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_recovery_results" ADD CONSTRAINT "resource_recovery_results_inventory_reservation_id_inventory_reservations_id_fk" FOREIGN KEY ("inventory_reservation_id") REFERENCES "public"."inventory_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_recovery_results_case_idx" ON "resource_recovery_results" USING btree ("failure_case_id");--> statement-breakpoint
CREATE INDEX "resource_recovery_results_correlation_idx" ON "resource_recovery_results" USING btree ("correlation_id");