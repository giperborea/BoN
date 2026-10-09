import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { authorizeUrl, pkce } from "@/lib/lichess";

export async function GET() {
  const u = await getUser();
  if (!u) return NextResponse.redirect(new URL("/login", process.env.APP_URL || "http://localhost:3000"));
  const { verifier, challenge, state } = pkce();
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("lichess_verifier", verifier, opts);
  jar.set("lichess_state", state, opts);
  // Тренеру нужен доступ к приватным студиям.
  const scope = u.role === "COACH" || u.role === "ADMIN" ? "study:read" : "";
  return NextResponse.redirect(authorizeUrl({ challenge, state, scope }));
}
