import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl, exchangeCode, fetchAccount } from "@/lib/lichess";

export async function GET(req: NextRequest) {
  const base = appUrl();
  const u = await getUser();
  if (!u) return NextResponse.redirect(`${base}/login`);
  const jar = await cookies();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = jar.get("lichess_verifier")?.value;
  const fail = (msg: string) => NextResponse.redirect(`${base}/link-lichess?error=${encodeURIComponent(msg)}`);
  if (!code || !verifier || state !== jar.get("lichess_state")?.value) return fail("неверный ответ авторизации");
  try {
    const token = await exchangeCode(code, verifier);
    const acc = await fetchAccount(token);
    const taken = await db.user.findFirst({ where: { lichessUsername: acc.username, NOT: { id: u.id } } });
    if (taken) return fail(`аккаунт ${acc.username} уже привязан к другому пользователю`);
    await db.user.update({ where: { id: u.id }, data: { lichessUsername: acc.username, lichessToken: token, lichessLinkedAt: new Date() } });
  } catch (e) {
    return fail((e as Error).message);
  } finally {
    jar.delete("lichess_verifier");
    jar.delete("lichess_state");
  }
  return NextResponse.redirect(`${base}/`);
}
