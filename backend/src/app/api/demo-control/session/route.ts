import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { getDemoManager } from "@/lib/demo/service";

export const dynamic = "force-dynamic";
export async function POST() {
  try {
    const user = await getDemoManager();
    await createSession(user);
    return NextResponse.json({ user: { email: user.email, displayName: user.displayName, role: user.role } });
  } catch (error) { return NextResponse.json({ error: "DEMO_SESSION_REFUSED", message: error instanceof Error ? error.message : "Demo session refused." }, { status: 403 }); }
}
