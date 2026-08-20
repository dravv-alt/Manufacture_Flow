import { z } from "zod";

const actor = z.string().trim().min(2).max(120);

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reserve_part"), actor, quantity: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("approve_reroute"), actor }),
  z.object({ type: z.literal("advance_maintenance"), actor, expectedStage: z.number().int().min(1).max(7) }),
  z.object({ type: z.literal("start_maintenance"), actor, workOrderId: z.string().uuid(), expectedStage: z.number().int().min(1).max(3), notes: z.string().trim().min(1).max(2000).optional() }),
  z.object({ type: z.literal("record_repair_completion"), actor, workOrderId: z.string().uuid(), expectedStage: z.number().int().min(3).max(6), notes: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal("start_machine_testing"), actor, workOrderId: z.string().uuid(), expectedStage: z.literal(4), notes: z.string().trim().min(1).max(2000).optional() }),
  z.object({ type: z.literal("record_return_to_service_validation"), actor, workOrderId: z.string().uuid(), expectedStage: z.union([z.literal(5), z.literal(6), z.literal(7)]), passed: z.boolean(), notes: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal("acknowledge_notification"), actor, notificationId: z.string().uuid() }),
  z.object({ type: z.literal("retry_notification"), actor, notificationId: z.string().uuid() }),
  z.object({ type: z.literal("set_procurement_state"), actor, state: z.enum(["draft", "sent", "acknowledged", "delayed"]) }),
  z.object({ type: z.literal("record_procurement_note"), actor, note: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal("set_shipment_state"), actor, state: z.enum(["no-impact", "revised", "delayed", "notification-pending", "notified", "failed"]) }),
]);
