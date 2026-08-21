import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { publicRuntimeInfo } from "@/lib/runtime/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", service: "manufacture-flow", database: "postgres", runtime: publicRuntimeInfo(), timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: "degraded", service: "manufacture-flow", database: "unavailable", reason: error instanceof Error ? error.message : "Database unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
