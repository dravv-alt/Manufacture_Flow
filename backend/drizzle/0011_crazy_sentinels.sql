ALTER TABLE "maintenance_work_orders" ADD COLUMN "priority" varchar(32);--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "diagnosis" text;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "resource_recovery_result_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "procurement_automation_result_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "planned_window_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "planned_window_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD COLUMN "checklist" jsonb;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_resource_recovery_result_id_resource_recovery_results_id_fk" FOREIGN KEY ("resource_recovery_result_id") REFERENCES "public"."resource_recovery_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_procurement_automation_result_id_procurement_automation_results_id_fk" FOREIGN KEY ("procurement_automation_result_id") REFERENCES "public"."procurement_automation_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_resource_recovery_result_id_unique" UNIQUE("resource_recovery_result_id");