import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PredictionNotFoundError, runFailurePrediction } from "@/lib/predictions/service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ sourceEventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const allowedRoles: Array<typeof user.role> = ["Plant Manager", "Production Supervisor"];
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "ROLE_FORBIDDEN", message: `${user.role} cannot request a failure prediction.` }, { status: 403 });

  try {
    const { sourceEventId } = await context.params;
    const result = await runFailurePrediction(sourceEventId);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const status = error instanceof PredictionNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "PREDICTION_INPUT_NOT_FOUND" : "PREDICTION_UNAVAILABLE", message: error instanceof Error ? error.message : "Failure prediction unavailable." }, { status });
  }
}
