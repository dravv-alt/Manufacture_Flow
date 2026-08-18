import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const loginSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(200) });
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  await createSession(user);
  return NextResponse.json({ user: { email: user.email, displayName: user.displayName, role: user.role } });
}
