import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, failurePredictions, inventoryItems, inventoryReservations, parts, resourceRecoveryResults, workstations, workflowEvents } from "@/lib/db/schema";

const REQUIRED_QUANTITY = 1;

export class ResourceRecoveryNotFoundError extends Error {}

export async function runResourceRecovery(input: { predictionId: string; correlationId: string; failureCaseExternalId: string; component: string; requiredPartCode: string }) {
  const [prediction] = await db.select({
    id: failurePredictions.id,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
    component: failurePredictions.component,
    partId: parts.id,
    partCode: parts.code,
    plantId: workstations.plantId,
    workstationId: workstations.id,
  }).from(failurePredictions)
    .innerJoin(failureCases, eq(failurePredictions.failureCaseId, failureCases.id))
    .innerJoin(parts, eq(failurePredictions.partId, parts.id))
    .innerJoin(workstations, eq(failurePredictions.workstationId, workstations.id))
    .where(eq(failurePredictions.id, input.predictionId))
    .limit(1);
  if (!prediction) throw new ResourceRecoveryNotFoundError(`Failure prediction ${input.predictionId} was not found.`);
  if (prediction.failureCaseExternalId !== input.failureCaseExternalId || prediction.component !== input.component || prediction.partCode !== input.requiredPartCode) {
    throw new ResourceRecoveryNotFoundError("Recovery graph state does not match the persisted failure prediction context.");
  }

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "ResourceRecoveryAgent",
    status: "running",
    workstationId: prediction.workstationId,
    correlationId: input.correlationId,
    sourceEventId: prediction.id,
    input: { failurePredictionId: prediction.id, failureCaseId: prediction.failureCaseExternalId, component: prediction.component, requiredPartCode: prediction.partCode, requiredQuantity: REQUIRED_QUANTITY, correlationId: input.correlationId },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [existingResult] = await db.select().from(resourceRecoveryResults).where(eq(resourceRecoveryResults.failurePredictionId, prediction.id)).limit(1);
    const [existingRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "ResourceRecoveryAgent"), eq(agentRuns.sourceEventId, prediction.id))).limit(1);
    if (!existingResult) throw new ResourceRecoveryNotFoundError(`Resource recovery for prediction ${prediction.id} is incomplete and requires operational review.`);
    return { idempotent: true, agentRun: existingRun ?? null, result: existingResult };
  }

  try {
    const outcome = await db.transaction(async (tx) => {
      const candidates = await tx.select().from(inventoryItems)
        .where(and(eq(inventoryItems.partId, prediction.partId), eq(inventoryItems.plantId, prediction.plantId)));

      for (const candidate of candidates) {
        const availableQuantity = candidate.onHand - candidate.reserved;
        if (availableQuantity < REQUIRED_QUANTITY) continue;
        const [updatedInventory] = await tx.update(inventoryItems)
          .set({ reserved: sql`${inventoryItems.reserved} + ${REQUIRED_QUANTITY}`, state: "reserved", version: sql`${inventoryItems.version} + 1`, updatedAt: new Date() })
          .where(and(eq(inventoryItems.id, candidate.id), sql`${inventoryItems.onHand} - ${inventoryItems.reserved} >= ${REQUIRED_QUANTITY}`))
          .returning();
        if (!updatedInventory) continue;

        const [reservation] = await tx.insert(inventoryReservations).values({ inventoryItemId: candidate.id, failureCaseId: prediction.failureCaseId, quantity: REQUIRED_QUANTITY, actor: "Resource Recovery Agent" }).returning();
        const [result] = await tx.insert(resourceRecoveryResults).values({
          failurePredictionId: prediction.id,
          failureCaseId: prediction.failureCaseId,
          inventoryItemId: candidate.id,
          inventoryReservationId: reservation.id,
          correlationId: input.correlationId,
          outcome: "reserved",
          requiredQuantity: REQUIRED_QUANTITY,
          availableQuantity,
          reason: `Reserved ${REQUIRED_QUANTITY} ${prediction.partCode} from ${candidate.location}.`,
        }).returning();
        await tx.update(failureCases).set({ workflowState: "Part reserved / recovery planning pending", updatedAt: new Date() }).where(eq(failureCases.id, prediction.failureCaseId));
        await tx.insert(workflowEvents).values({
          failureCaseId: prediction.failureCaseId,
          entityType: "resource_recovery_result",
          entityId: result.id,
          eventType: "inventory_reserved_for_recovery",
          actor: "Resource Recovery Agent",
          payload: { correlationId: input.correlationId, failurePredictionId: prediction.id, inventoryItemId: candidate.id, inventoryReservationId: reservation.id, partCode: prediction.partCode, quantity: REQUIRED_QUANTITY },
        });
        return result;
      }

      const availableQuantity = candidates.reduce((total, item) => total + Math.max(0, item.onHand - item.reserved), 0);
      const [result] = await tx.insert(resourceRecoveryResults).values({
        failurePredictionId: prediction.id,
        failureCaseId: prediction.failureCaseId,
        correlationId: input.correlationId,
        outcome: "procurement_required",
        requiredQuantity: REQUIRED_QUANTITY,
        availableQuantity,
        reason: `${prediction.partCode} has insufficient reservable stock; procurement is required.`,
      }).returning();
      await tx.update(failureCases).set({ workflowState: "Part unavailable / procurement required", updatedAt: new Date() }).where(eq(failureCases.id, prediction.failureCaseId));
      await tx.insert(workflowEvents).values({
        failureCaseId: prediction.failureCaseId,
        entityType: "resource_recovery_result",
        entityId: result.id,
        eventType: "part_unavailable_procurement_required",
        actor: "Resource Recovery Agent",
        payload: { correlationId: input.correlationId, failurePredictionId: prediction.id, partCode: prediction.partCode, requiredQuantity: REQUIRED_QUANTITY, availableQuantity },
      });
      return result;
    });
    await db.update(agentRuns).set({ status: "completed", output: { resourceRecoveryResultId: outcome.id, outcome: outcome.outcome, inventoryItemId: outcome.inventoryItemId, inventoryReservationId: outcome.inventoryReservationId, requiredQuantity: outcome.requiredQuantity, availableQuantity: outcome.availableQuantity }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, result: outcome };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Resource recovery unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
