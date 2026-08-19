import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { AlertingNotFoundError, runFailurePredictionAlerting } from "@/lib/alerts/service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ predictionId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const allowedRoles: Array<typeof user.role> = ["Plant Manager", "Production Supervisor"];
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "ROLE_FORBIDDEN", message: `${user.role} cannot request failure-prediction alerting.` }, { status: 403 });

  try {
    const { predictionId } = await context.params;
    const result = await runFailurePredictionAlerting(predictionId);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const status = error instanceof AlertingNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "FAILURE_PREDICTION_NOT_FOUND" : "ALERTING_UNAVAILABLE", message: error instanceof Error ? error.message : "Failure-prediction alerting unavailable." }, { status });
  }
}
