import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { runRecoveryGraph } from "@/lib/agent-graph/graph";

export const dynamic = "force-dynamic";

const graphRunSchema = z.object({ telemetrySourceEventId: z.string().trim().min(8).max(128), correlationId: z.string().trim().min(8).max(160).optional() });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const allowedRoles: Array<typeof user.role> = ["Plant Manager", "Production Supervisor"];
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "ROLE_FORBIDDEN", message: `${user.role} cannot start a recovery graph run.` }, { status: 403 });
  const parsed = graphRunSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_GRAPH_RUN", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await runRecoveryGraph(parsed.data);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: "RECOVERY_GRAPH_UNAVAILABLE", message: error instanceof Error ? error.message : "Recovery graph unavailable." }, { status: 503 });
  }
}
