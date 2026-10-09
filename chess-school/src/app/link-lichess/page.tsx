import { redirect } from "next/navigation";
import { requireUser, needsConsent, needsLichess, homeFor } from "@/lib/auth";
import { TEST_MODE } from "@/lib/config";
import { ActionForm } from "@/components/ActionForm";
import { linkLichessTest } from "@/app/actions/auth";

export default async function LinkLichess({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await requireUser(undefined, { skipGates: true });
  if (needsConsent(u)) redirect("/consent");
  if (!needsLichess(u)) redirect(homeFor(u.role));
  const { error } = await searchParams;
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="card">
        <h1>Подключите Lichess</h1>
        <p className="muted">
          {u.role === "COACH"
            ? "Тренеру Lichess нужен, чтобы подтягивать студии после занятий и назначать домашку."
            : "Lichess нужен, чтобы видеть студии с занятий и домашние задания от тренера."}
        </p>
        {error && <div className="alert error">Не удалось подключить Lichess: {error}</div>}
        <a className="btn lg" href="/api/lichess/connect">Войти через Lichess</a>
        <p className="tiny muted mt">Вы перейдёте на lichess.org, подтвердите доступ и вернётесь обратно.</p>
      </div>
      {TEST_MODE && (
        <div className="card">
          <h3>Тестовое подключение</h3>
          <p className="small muted">В тестовом режиме можно указать ник без перехода на Lichess.</p>
          <ActionForm action={linkLichessTest} className="row" submit="Подключить (тест)" submitClass="btn secondary">
            <input name="username" placeholder="Ник на Lichess" style={{ maxWidth: 260 }} />
          </ActionForm>
        </div>
      )}
    </div>
  );
}
