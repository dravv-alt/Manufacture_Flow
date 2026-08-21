import { NextResponse } from "next/server";
import { z } from "zod";
import { tickDemoTelemetry, triggerDemoTelemetry } from "@/lib/demo/service";

export const dynamic = "force-dynamic";
const inputSchema = z.object({ scenario: z.enum(["golden", "local-spare", "failure-rework"]).default("golden"), mode: z.enum(["trigger", "tick"]).default("trigger") });
export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_DEMO_SCENARIO" }, { status: 400 });
  try { return NextResponse.json(parsed.data.mode === "tick" ? await tickDemoTelemetry() : await triggerDemoTelemetry(parsed.data.scenario)); }
  catch (error) { return NextResponse.json({ error: "DEMO_TRIGGER_FAILED", message: error instanceof Error ? error.message : "Demo telemetry failed." }, { status: 503 }); }
}
