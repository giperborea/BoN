import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "bon_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me-0123456789abcdef");

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return await db.user.findUnique({ where: { id: payload.uid } });
  } catch {
    return null;
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Lichess обязателен для учеников и тренеров. */
export function needsLichess(u: SessionUser) {
  return (u.role === "STUDENT" || u.role === "COACH") && !u.lichessUsername;
}

/** Согласие на обработку ПД спрашивается у учеников и родителей при первом входе. */
export function needsConsent(u: SessionUser) {
  return (u.role === "STUDENT" || u.role === "PARENT") && !u.consentAt;
}

export function homeFor(role: string) {
  switch (role) {
    case "ADMIN": return "/admin";
    case "COACH": return "/coach";
    case "PARENT": return "/parent";
    default: return "/student";
  }
}

/** Проверка доступа для страниц. ADMIN имеет доступ ко всем разделам тренера. */
export async function requireUser(roles?: string[], opts: { skipGates?: boolean } = {}) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!opts.skipGates) {
    if (needsConsent(u)) redirect("/consent");
    if (needsLichess(u)) redirect("/link-lichess");
  }
  if (roles && !roles.includes(u.role) && !(u.role === "ADMIN" && roles.includes("COACH"))) {
    redirect(homeFor(u.role));
  }
  return u;
}
