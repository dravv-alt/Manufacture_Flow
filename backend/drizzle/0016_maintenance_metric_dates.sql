ALTER TABLE "machine_metric_snapshots" ADD COLUMN "last_maintenance_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "machine_metric_snapshots" ADD COLUMN "next_maintenance_at" timestamp with time zone NOT NULL DEFAULT now();
