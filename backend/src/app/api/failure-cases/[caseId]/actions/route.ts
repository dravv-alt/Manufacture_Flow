import { NextResponse } from "next/server";
import { applyWorkflowAction, OperationConflictError, OperationNotFoundError } from "@/lib/operations/service";
import { workflowActionSchema } from "@/lib/operations/validation";
import { getCurrentUser } from "@/lib/auth/session";
import { isWorkflowActionAllowed } from "@/lib/operations/authorization";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const parsed = workflowActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_ACTION", issues: parsed.error.flatten() }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  if (!isWorkflowActionAllowed(parsed.data.type, user.role)) return NextResponse.json({ error: "ROLE_FORBIDDEN", message: `${user.role} cannot perform ${parsed.data.type}.` }, { status: 403 });

  try {
    const { caseId } = await context.params;
    return NextResponse.json(await applyWorkflowAction(caseId, { ...parsed.data, actor: user.displayName }));
  } catch (error) {
    const status = error instanceof OperationNotFoundError ? 404 : error instanceof OperationConflictError ? 409 : 503;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : status === 409 ? "WORKFLOW_CONFLICT" : "WORKFLOW_UNAVAILABLE", message: error instanceof Error ? error.message : "Workflow action unavailable" }, { status });
  }
}
