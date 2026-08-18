import { NextResponse } from "next/server";
import { getOverview } from "@/lib/operations/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getOverview());
  } catch (error) {
    return NextResponse.json({ error: "OVERVIEW_UNAVAILABLE", message: error instanceof Error ? error.message : "Overview unavailable" }, { status: 503 });
  }
}
