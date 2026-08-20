import { and, eq } from "drizzle-orm";
import { rankEligibleVendors } from "@/lib/agents/procurement-automation";
import { db } from "@/lib/db/client";
import { agentRuns, failureCases, parts, procurementAutomationResults, procurementRequests, resourceRecoveryResults, vendorNotifications, vendorPartCapabilities, vendors, workflowEvents } from "@/lib/db/schema";

const CC_ROLES = ["Warehouse Team", "Procurement Team"];

export class ProcurementAutomationNotFoundError extends Error {}

export async function runProcurementAutomation(input: { resourceRecoveryResultId: string; correlationId: string; failureCaseExternalId: string; requiredPartCode: string }) {
  const [recovery] = await db.select({
    id: resourceRecoveryResults.id,
    correlationId: resourceRecoveryResults.correlationId,
    outcome: resourceRecoveryResults.outcome,
    requiredQuantity: resourceRecoveryResults.requiredQuantity,
    failureCaseId: failureCases.id,
    failureCaseExternalId: failureCases.externalId,
    partId: parts.id,
    partCode: parts.code,
    createdAt: resourceRecoveryResults.createdAt,
  }).from(resourceRecoveryResults)
    .innerJoin(failureCases, eq(resourceRecoveryResults.failureCaseId, failureCases.id))
    .innerJoin(parts, eq(failureCases.partId, parts.id))
    .where(eq(resourceRecoveryResults.id, input.resourceRecoveryResultId))
    .limit(1);
  if (!recovery) throw new ProcurementAutomationNotFoundError(`Resource recovery result ${input.resourceRecoveryResultId} was not found.`);
  if (recovery.outcome !== "procurement_required" || recovery.correlationId !== input.correlationId || recovery.failureCaseExternalId !== input.failureCaseExternalId || recovery.partCode !== input.requiredPartCode) {
    throw new ProcurementAutomationNotFoundError("Recovery graph state does not match a procurement-required resource recovery result.");
  }

  const [createdRun] = await db.insert(agentRuns).values({
    agentName: "ProcurementAutomationAgent",
    status: "running",
    correlationId: input.correlationId,
    sourceEventId: recovery.id,
    input: { resourceRecoveryResultId: recovery.id, failureCaseId: recovery.failureCaseExternalId, partCode: recovery.partCode, correlationId: input.correlationId },
  }).onConflictDoNothing({ target: [agentRuns.agentName, agentRuns.sourceEventId] }).returning();

  if (!createdRun) {
    const [existingResult] = await db.select().from(procurementAutomationResults).where(eq(procurementAutomationResults.resourceRecoveryResultId, recovery.id)).limit(1);
    const [existingRun] = await db.select().from(agentRuns).where(and(eq(agentRuns.agentName, "ProcurementAutomationAgent"), eq(agentRuns.sourceEventId, recovery.id))).limit(1);
    if (!existingResult) throw new ProcurementAutomationNotFoundError(`Procurement automation for recovery result ${recovery.id} is incomplete and requires operational review.`);
    return { idempotent: true, agentRun: existingRun ?? null, result: existingResult, vendorNotification: existingResult.procurementRequestId ? (await db.select().from(vendorNotifications).where(eq(vendorNotifications.procurementRequestId, existingResult.procurementRequestId)).limit(1))[0] ?? null : null };
  }

  try {
    const candidateRows = await db.select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      contactEmail: vendors.contactEmail,
      approved: vendors.approved,
      active: vendors.active,
      capabilityActive: vendorPartCapabilities.active,
      leadTimeHours: vendorPartCapabilities.leadTimeHours,
      unitCostCents: vendorPartCapabilities.unitCostCents,
      reliabilityScore: vendorPartCapabilities.reliabilityScore,
    }).from(vendorPartCapabilities)
      .innerJoin(vendors, eq(vendorPartCapabilities.vendorId, vendors.id))
      .where(eq(vendorPartCapabilities.partId, recovery.partId));
    const ranked = rankEligibleVendors(candidateRows);

    const result = await db.transaction(async (tx) => {
      const rankedOptions = ranked.map(({ vendorId, vendorName, leadTimeHours, unitCostCents, reliabilityScore }) => ({ vendorId, vendorName, leadTimeHours, unitCostCents, reliabilityScore }));
      const selected = ranked[0];
      if (!selected) {
        const [noVendorResult] = await tx.insert(procurementAutomationResults).values({
          resourceRecoveryResultId: recovery.id,
          failureCaseId: recovery.failureCaseId,
          correlationId: input.correlationId,
          outcome: "no_eligible_vendor",
          rankedOptions,
          reason: `No approved active vendor can supply ${recovery.partCode}.`,
        }).returning();
        await tx.update(failureCases).set({ workflowState: "Procurement intervention required / no eligible vendor", updatedAt: new Date() }).where(eq(failureCases.id, recovery.failureCaseId));
        await tx.insert(workflowEvents).values({ failureCaseId: recovery.failureCaseId, entityType: "procurement_automation_result", entityId: noVendorResult.id, eventType: "no_eligible_vendor_for_procurement", actor: "Procurement Automation Agent", payload: { correlationId: input.correlationId, resourceRecoveryResultId: recovery.id, partCode: recovery.partCode, rankedOptions } });
        return { procurementResult: noVendorResult, vendorNotification: null };
      }

      const [existingRequest] = await tx.select().from(procurementRequests).where(and(eq(procurementRequests.failureCaseId, recovery.failureCaseId), eq(procurementRequests.partId, recovery.partId))).limit(1);
      const [request] = existingRequest ? [existingRequest] : await tx.insert(procurementRequests).values({
        externalId: `PR-AUTO-${recovery.id.slice(0, 12).toUpperCase()}`,
        failureCaseId: recovery.failureCaseId,
        partId: recovery.partId,
        quantity: recovery.requiredQuantity,
        vendor: selected.vendorName,
        state: "sent",
        requiredBy: recovery.createdAt,
      }).returning();
      const [existingNotification] = await tx.select().from(vendorNotifications).where(eq(vendorNotifications.procurementRequestId, request.id)).limit(1);
      const [vendorNotification] = existingNotification ? [existingNotification] : await tx.insert(vendorNotifications).values({
        procurementRequestId: request.id,
        vendorId: selected.vendorId,
        recipientEmail: selected.contactEmail,
        ccRoles: CC_ROLES,
        body: `Controlled purchase requisition ${request.externalId}: supply ${recovery.requiredQuantity} ${recovery.partCode} for failure case ${recovery.failureCaseExternalId}.`,
        state: "queued",
      }).returning();
      const [procurementResult] = await tx.insert(procurementAutomationResults).values({
        resourceRecoveryResultId: recovery.id,
        failureCaseId: recovery.failureCaseId,
        selectedVendorId: selected.vendorId,
        procurementRequestId: request.id,
        correlationId: input.correlationId,
        outcome: "requisition_created",
        rankedOptions,
        reason: `Selected ${selected.vendorName} by deterministic lead-time, cost, and reliability ranking.`,
      }).returning();
      await tx.update(failureCases).set({ workflowState: "Purchase requisition queued / vendor notification pending", updatedAt: new Date() }).where(eq(failureCases.id, recovery.failureCaseId));
      await tx.insert(workflowEvents).values([
        { failureCaseId: recovery.failureCaseId, entityType: "procurement_request", entityId: request.id, eventType: "purchase_requisition_created", actor: "Procurement Automation Agent", payload: { correlationId: input.correlationId, resourceRecoveryResultId: recovery.id, vendorId: selected.vendorId, partCode: recovery.partCode, quantity: recovery.requiredQuantity, reusedExistingRequest: Boolean(existingRequest) } },
        { failureCaseId: recovery.failureCaseId, entityType: "vendor_notification", entityId: vendorNotification.id, eventType: "vendor_notification_queued", actor: "Procurement Automation Agent", payload: { correlationId: input.correlationId, procurementRequestId: request.id, vendorId: selected.vendorId, ccRoles: CC_ROLES } },
      ]);
      return { procurementResult, vendorNotification };
    });
    await db.update(agentRuns).set({ status: "completed", output: { procurementAutomationResultId: result.procurementResult.id, outcome: result.procurementResult.outcome, procurementRequestId: result.procurementResult.procurementRequestId, vendorNotificationId: result.vendorNotification?.id ?? null }, completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    return { idempotent: false, agentRun: { id: createdRun.id, status: "completed" as const }, result: result.procurementResult, vendorNotification: result.vendorNotification };
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Procurement automation unavailable.", completedAt: new Date() }).where(eq(agentRuns.id, createdRun.id));
    throw error;
  }
}
