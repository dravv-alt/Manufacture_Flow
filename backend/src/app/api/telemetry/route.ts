import { NextResponse } from "next/server";
import { TelemetryNotFoundError, ingestTelemetry, listRecentTelemetry } from "@/lib/telemetry/service";
import { telemetryIngestSchema } from "@/lib/telemetry/validation";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configuredKey = process.env.TELEMETRY_INGEST_API_KEY;
  if (configuredKey) return request.headers.get("x-telemetry-api-key") === configuredKey;
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "TELEMETRY_INGEST_UNAUTHORIZED" }, { status: 401 });
  const parsed = telemetryIngestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_TELEMETRY", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await ingestTelemetry(parsed.data);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const status = error instanceof TelemetryNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "WORKSTATION_NOT_FOUND" : "TELEMETRY_UNAVAILABLE", message: error instanceof Error ? error.message : "Telemetry ingestion unavailable." }, { status });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workstationCode = url.searchParams.get("workstationCode")?.trim();
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
  if (!workstationCode) return NextResponse.json({ error: "WORKSTATION_CODE_REQUIRED" }, { status: 400 });

  try {
    return NextResponse.json(await listRecentTelemetry(workstationCode, limit));
  } catch (error) {
    const status = error instanceof TelemetryNotFoundError ? 404 : 503;
    return NextResponse.json({ error: status === 404 ? "WORKSTATION_NOT_FOUND" : "TELEMETRY_UNAVAILABLE", message: error instanceof Error ? error.message : "Telemetry query unavailable." }, { status });
  }
}
