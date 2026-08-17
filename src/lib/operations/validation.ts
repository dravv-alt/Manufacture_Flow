import { z } from "zod";

const actor = z.string().trim().min(2).max(120);

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reserve_part"), actor, quantity: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("approve_reroute"), actor }),
  z.object({ type: z.literal("advance_maintenance"), actor, expectedStage: z.number().int().min(1).max(7) }),
  z.object({ type: z.literal("acknowledge_notification"), actor, notificationId: z.string().uuid() }),
]);
