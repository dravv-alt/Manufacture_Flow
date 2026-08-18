CREATE TYPE "public"."procurement_message_kind" AS ENUM('system', 'internal_note', 'vendor');--> statement-breakpoint
CREATE TABLE "procurement_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procurement_request_id" uuid NOT NULL,
	"kind" "procurement_message_kind" NOT NULL,
	"body" text NOT NULL,
	"actor" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "procurement_messages" ADD CONSTRAINT "procurement_messages_procurement_request_id_procurement_requests_id_fk" FOREIGN KEY ("procurement_request_id") REFERENCES "public"."procurement_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "procurement_messages_request_time_idx" ON "procurement_messages" USING btree ("procurement_request_id","created_at");