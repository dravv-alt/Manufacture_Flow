import { NextResponse } from "next/server";
import { getCaseDetail, OperationNotFoundError } from "@/lib/operations/service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await context.params;
    return NextResponse.json(await getCaseDetail(caseId));
  } catch (error) {
    const status = error instanceof OperationNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "FAILURE_CASE_NOT_FOUND" : "FAILURE_CASE_UNAVAILABLE", message: error instanceof Error ? error.message : "Failure case unavailable" }, { status });
  }
}
