import { NextResponse } from "next/server";
import { RecoveryGraphRunNotFoundError, getRecoveryGraphRun } from "@/lib/agent-graph/graph";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ correlationId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  try {
    const { correlationId } = await context.params;
    return NextResponse.json(await getRecoveryGraphRun(correlationId));
  } catch (error) {
    const status = error instanceof RecoveryGraphRunNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "RECOVERY_GRAPH_RUN_NOT_FOUND" : "RECOVERY_GRAPH_UNAVAILABLE", message: error instanceof Error ? error.message : "Recovery graph unavailable." }, { status });
  }
}
