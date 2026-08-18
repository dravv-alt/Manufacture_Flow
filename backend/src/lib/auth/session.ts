import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { authSessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "machine_overwatch_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  role: typeof users.$inferSelect.role;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(user: AuthenticatedUser) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(authSessions).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [session] = await db.select({ user: users }).from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date()), isNull(authSessions.revokedAt)))
    .limit(1);
  return session?.user ?? null;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.update(authSessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(eq(authSessions.tokenHash, hashToken(token)));
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", expires: new Date(0), path: "/" });
}
