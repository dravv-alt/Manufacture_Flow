import { NextResponse } from "next/server";
import { applyWorkflowAction, OperationConflictError, OperationNotFoundError } from "@/lib/operations/service";
import { workflowActionSchema } from "@/lib/operations/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const parsed = workflowActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_ACTION", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const { caseId } = await context.params;
    return NextResponse.json(await applyWorkflowAction(caseId, parsed.data));
  } catch (error) {
    const status = error instanceof OperationNotFoundError ? 404 : error instanceof OperationConflictError ? 409 : 503;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : status === 409 ? "WORKFLOW_CONFLICT" : "WORKFLOW_UNAVAILABLE", message: error instanceof Error ? error.message : "Workflow action unavailable" }, { status });
  }
}
