import { NextResponse } from "next/server";
import { getOverview } from "@/lib/operations/service";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getCurrentUser()) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  try {
    return NextResponse.json(await getOverview());
  } catch (error) {
    return NextResponse.json({ error: "OVERVIEW_UNAVAILABLE", message: error instanceof Error ? error.message : "Overview unavailable" }, { status: 503 });
  }
}
