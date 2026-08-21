import { NextResponse } from "next/server";
import { z } from "zod";
import { resetDemoScenario } from "@/lib/demo/service";

export const dynamic = "force-dynamic";
const inputSchema = z.object({ scenario: z.enum(["golden", "local-spare", "failure-rework"]).default("golden") });
export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_DEMO_SCENARIO", issues: parsed.error.flatten() }, { status: 400 });
  try { return NextResponse.json(await resetDemoScenario(parsed.data.scenario)); }
  catch (error) { return NextResponse.json({ error: "DEMO_CONTROL_REFUSED", message: error instanceof Error ? error.message : "Demo reset refused." }, { status: 403 }); }
}
