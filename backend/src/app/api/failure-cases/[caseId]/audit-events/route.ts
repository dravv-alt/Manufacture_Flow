import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { failureCases, workflowEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export async function GET(_: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const [failureCase] = await db.select({ id: failureCases.id }).from(failureCases).where(eq(failureCases.externalId, caseId)).limit(1);
  if (!failureCase) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const events = await db.select({ id: workflowEvents.id, entityType: workflowEvents.entityType, eventType: workflowEvents.eventType, actor: workflowEvents.actor, payload: workflowEvents.payload, occurredAt: workflowEvents.occurredAt }).from(workflowEvents).where(eq(workflowEvents.failureCaseId, failureCase.id)).orderBy(desc(workflowEvents.occurredAt));
  return NextResponse.json({ events });
}
