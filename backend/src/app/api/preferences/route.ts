import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";

const bodySchema = z.object({ reducedMotion: z.boolean() });
export const dynamic = "force-dynamic";
export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 }); const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1); return NextResponse.json({ reducedMotion: preference?.reducedMotion ?? false }); }
export async function PUT(request: Request) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 }); const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_PREFERENCES" }, { status: 400 }); const [preference] = await db.insert(userPreferences).values({ userId: user.id, reducedMotion: parsed.data.reducedMotion }).onConflictDoUpdate({ target: userPreferences.userId, set: { reducedMotion: parsed.data.reducedMotion, updatedAt: new Date() } }).returning(); return NextResponse.json({ reducedMotion: preference.reducedMotion }); }
