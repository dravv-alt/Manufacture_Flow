import { and, eq, inArray } from "drizzle-orm";
import { DELIVERY_IMPACT_CALCULATION_VERSION, calculateDeliveryImpact } from "@/lib/agents/delivery-impact";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, productionJobs, recoveryTimeEstimates, rerouteDecisions, reroutePlans, shipmentImpacts, workflowEvents } from "@/lib/db/schema";
import { PostgresShipmentCommitmentRepository, type ShipmentCommitmentRepository } from "@/lib/shipment-commitments/repository";

export class DeliveryImpactNotFoundError extends Error {}

type RerouteRationale = { projectedJobCompletionAt?: string };

export async function runDeliveryImpact(input: { recoveryTimeEstimateId: string; rerouteDecisionIds: string[]; correlationId: string; failureCaseExternalId: string }, repository: ShipmentCommitmentRepository = new PostgresShipmentCommitmentRepository()) {
  const [context] = await db.select({ estimateId: recoveryTimeEstimates.id, correlationId: recoveryTimeEstimates.correlationId, failureCaseId: failureCases.id, failureCaseExternalId: failureCases.externalId, workstationId: failureCases.workstationId, expectedRecoveryAt: recoveryTimeEstimates.expectedRecoveryAt }).from(recoveryTimeEstimates).innerJoin(failureCases, eq(recoveryTimeEstimates.failureCaseId, failureCases.id)).where(eq(recoveryTimeEstimates.id, input.recoveryTimeEstimateId)).limit(1);
  if (!context || context.correlationId !== input.correlationId || context.failureCaseExternalId !== input.failureCaseExternalId) throw new DeliveryImpactNotFoundError("Recovery-time estimate does not match the persisted delivery-impact context.");
  const decisions = input.rerouteDecisionIds.length === 0 ? [] : await db.select().from(rerouteDecisions).where(and(eq(rerouteDecisions.correlationId, input.correlationId), inArray(rerouteDecisions.id, input.rerouteDecisionIds)));
  const executed = decisions.filter((decision) => decision.outcome === "rerouted");
  const sourceEventId = `delivery-impact:${context.estimateId}`;
  const [createdRun] = await db.insert(agentRuns).values({ agentName: "DeliveryImpactAgent", status: "running", workstationId: context.workstationId, correlationId: input.correlationId, sourceEventId, input: { ...input, calculationVersion: DELIVERY_IMPACT_CALCULATION_VERSION } }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();
  if (!createdRun) {
    const impacts = await db.select().from(shipmentImpacts).where(eq(shipmentImpacts.correlationId, input.correlationId));
    const [agentRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "DeliveryImpactAgent"), eq(agentRuns.sourceEventId, sourceEventId))).limit(1);
    return { idempotent: true, agentRun: agentRun ?? null, impacts, noLinkedShipment: executed.length === 0 || impacts.length === 0 };
  }
  try {
    const result = await db.transaction(async (tx) => {
      const jobIds = executed.map((decision) => decision.productionJobId);
      const commitments = await repository.findAffectedByProductionJobs(jobIds);
      if (commitments.length === 0) {
        await tx.insert(workflowEvents).values({ failureCaseId: context.failureCaseId, entityType: "delivery_impact", entityId: context.estimateId, eventType: "delivery_impact_no_linked_shipment", actor: "Delivery Impact Agent", payload: { correlationId: input.correlationId, recoveryTimeEstimateId: context.estimateId, rerouteDecisionIds: executed.map((item) => item.id), affectedJobIds: jobIds } });
        return { impacts: [], noLinkedShipment: true };
      }
      const plans = await tx.select().from(reroutePlans).where(eq(reroutePlans.failureCaseId, context.failureCaseId));
      const routedJobs = jobIds.length === 0 ? [] : await tx.select({ id: productionJobs.id, externalId: productionJobs.externalId }).from(productionJobs).where(inArray(productionJobs.id, jobIds));
      const externalIdByJobId = new Map(routedJobs.map((job) => [job.id, job.externalId]));
      const impacts = [] as Array<{ id: string; classification: string }>;
      for (const commitment of commitments) {
        const contributingDecisions = executed.filter((decision) => commitment.productionJobIds.includes(decision.productionJobId));
        const completions = contributingDecisions.map((decision) => {
          const rationale = decision.rationale as RerouteRationale;
          return rationale.projectedJobCompletionAt ? new Date(rationale.projectedJobCompletionAt) : context.expectedRecoveryAt;
        });
        const projectedCompletionAt = new Date(Math.max(...completions.map((value) => value.getTime())));
        const calculation = calculateDeliveryImpact({ projectedCompletionAt, originalCommittedAt: commitment.originalCommittedAt, postCompletionMinutes: commitment.postCompletionMinutes });
        const affectedJobIds = contributingDecisions.map((decision) => decision.productionJobId);
        const reroutePlanIds = plans.filter((plan) => plan.affectedJobs.some((externalId) => affectedJobIds.some((jobId) => externalIdByJobId.get(jobId) === externalId))).map((plan) => plan.id);
        const [impact] = await tx.insert(shipmentImpacts).values({ externalId: `${commitment.externalId}:${input.correlationId}`.slice(0, 64), failureCaseId: context.failureCaseId, originalEta: commitment.originalCommittedAt, revisedEta: calculation.revisedProjectedAt, deltaHours: Math.ceil(calculation.delayMinutes / 60), state: calculation.classification === "DELAYED" ? "revised" : "original", correlationId: input.correlationId, recoveryTimeEstimateId: context.estimateId, shipmentCommitmentId: commitment.id, rerouteDecisionIds: contributingDecisions.map((decision) => decision.id), reroutePlanIds, affectedJobIds, originalCommittedAt: commitment.originalCommittedAt, revisedProjectedAt: calculation.revisedProjectedAt, classification: calculation.classification, delayMinutes: calculation.delayMinutes, rationale: { calculationVersion: DELIVERY_IMPACT_CALCULATION_VERSION, projectedCompletionAt: projectedCompletionAt.toISOString(), postCompletionMinutes: commitment.postCompletionMinutes, riskBufferMinutes: calculation.riskBufferMinutes, marginMinutes: calculation.marginMinutes } }).onConflictDoNothing({ target: [shipmentImpacts.correlationId, shipmentImpacts.shipmentCommitmentId] }).returning();
        const persisted = impact ?? (await tx.select().from(shipmentImpacts).where(and(eq(shipmentImpacts.correlationId, input.correlationId), eq(shipmentImpacts.shipmentCommitmentId, commitment.id))).limit(1))[0];
        if (!persisted) throw new DeliveryImpactNotFoundError("Delivery impact was not found after idempotency lookup.");
        if (impact) await tx.insert(workflowEvents).values({ failureCaseId: context.failureCaseId, entityType: "shipment_impact", entityId: impact.id, eventType: "delivery_impact_calculated", actor: "Delivery Impact Agent", payload: { correlationId: input.correlationId, shipmentCommitmentId: commitment.id, classification: calculation.classification, delayMinutes: calculation.delayMinutes, affectedJobIds, recoveryTimeEstimateId: context.estimateId } });
        impacts.push({ id: persisted.id, classification: persisted.classification ?? calculation.classification });
      }
      return { impacts, noLinkedShipment: false };
    });
    await db.update(agentRuns).set({ status: "completed", output: { deliveryImpactIds: result.impacts.map((impact) => impact.id), noLinkedShipment: result.noLinkedShipment }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, ...result };
  } catch (error) { await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Delivery impact unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id)); throw error; }
}
