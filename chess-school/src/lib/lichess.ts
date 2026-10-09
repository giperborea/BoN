import { createHash, randomBytes } from "crypto";

export const LICHESS = "https://lichess.org";

export function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");
  return { verifier, challenge, state };
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function authorizeUrl(p: { challenge: string; state: string; scope: string }) {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LICHESS_CLIENT_ID || "bon-chess-school",
    redirect_uri: `${appUrl()}/api/lichess/callback`,
    code_challenge_method: "S256",
    code_challenge: p.challenge,
    scope: p.scope,
    state: p.state,
  });
  return `${LICHESS}/oauth?${q}`;
}

export async function exchangeCode(code: string, verifier: string) {
  const r = await fetch(`${LICHESS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, code_verifier: verifier,
      redirect_uri: `${appUrl()}/api/lichess/callback`,
      client_id: process.env.LICHESS_CLIENT_ID || "bon-chess-school",
    }),
  });
  if (!r.ok) throw new Error(`Lichess token error ${r.status}`);
  const j = await r.json();
  return j.access_token as string;
}

export async function fetchAccount(token: string) {
  const r = await fetch(`${LICHESS}/api/account`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Lichess account error ${r.status}`);
  return (await r.json()) as { id: string; username: string };
}

export type LichessStudy = { id: string; name: string; createdAt?: number; updatedAt?: number };

/** Тестовые студии — используются в тестовом режиме или если Lichess недоступен. */
export function mockStudies(username: string): LichessStudy[] {
  const topics = [
    "Мат в один ход", "Вилка конём", "Связка", "Двойной удар", "Ладейный эндшпиль", "Дебют: итальянская партия",
    "Сицилианская защита", "Пешечный эндшпиль: квадрат", "Атака на короля", "Открытое нападение",
    "Отвлечение и завлечение", "Мат Легаля", "Ферзь против пешки", "Защита Каро-Канн", "Принципы дебюта",
  ];
  let seed = [...username].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return topics.map((t, i) => ({
    id: (username.slice(0, 3) + i + Math.floor(rnd() * 1e6).toString(36)).padEnd(8, "x").slice(0, 8),
    name: t,
    updatedAt: Date.now() - i * 86_400_000,
  }));
}

/** Список студий тренера через API Lichess (нужен токен со scope study:read для приватных). */
export async function fetchStudies(username: string, token?: string | null): Promise<{ studies: LichessStudy[]; mock: boolean; error?: string }> {
  if (!token) return { studies: mockStudies(username), mock: true };
  try {
    const r = await fetch(`${LICHESS}/api/study/by/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/x-ndjson" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const studies = text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as LichessStudy);
    return { studies, mock: false };
  } catch (e) {
    return { studies: mockStudies(username), mock: true, error: (e as Error).message };
  }
}

export function studyUrl(id: string) {
  return `${LICHESS}/study/${id}`;
}

/** Достаёт id студии из ссылки вида https://lichess.org/study/AbCdEfGh[/chapter]. */
export function parseStudyId(input: string) {
  const m = input.trim().match(/study\/([A-Za-z0-9]{8})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{8}$/.test(input.trim())) return input.trim();
  return null;
}
