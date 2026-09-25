import { NextResponse } from "next/server";
import { getCaseDetail, OperationNotFoundError } from "@/lib/operations/service";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ caseId: string }> }) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  try {
    const { caseId } = await context.params;
    return NextResponse.json(await getCaseDetail(caseId));
  } catch (error) {
    const status = error instanceof OperationNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "FAILURE_CASE_NOT_FOUND" : "FAILURE_CASE_UNAVAILABLE", message: error instanceof Error ? error.message : "Failure case unavailable" }, { status });
  }
}
