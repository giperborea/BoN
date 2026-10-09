import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { TEST_MODE } from "@/lib/config";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { login, demoLogin } from "@/app/actions/auth";

export default async function LoginPage() {
  const u = await getUser();
  if (u) redirect(homeFor(u.role));
  const demo = TEST_MODE ? await db.user.findMany({
    where: { login: { in: ["andrey", "coach1", "coach2", "s001", "s002", "p001", "s100"] } },
    orderBy: { login: "asc" },
  }) : [];
  const label: Record<string, string> = {
    andrey: "Админ (Андрей)", coach1: "Тренер 1", coach2: "Тренер 2", s001: "Ученик (демо)",
    s002: "Ученик 2", p001: "Родитель", s100: "Новый ученик (онбординг)",
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card">
          <div className="row mb"><span className="brand"><span className="logo">♞</span>BoN Chess</span></div>
          <h1>Вход</h1>
          <ActionForm action={login} className="stack" submit="Войти" submitClass="btn block lg">
            <label className="field">Логин<input name="login" autoComplete="username" required /></label>
            <label className="field">Пароль<input name="password" type="password" autoComplete="current-password" required /></label>
          </ActionForm>
          <p className="small muted mt">После входа ученикам и тренерам нужно подключить аккаунт Lichess.</p>
        </div>
        {TEST_MODE && (
          <div className="card">
            <h3>Быстрый вход (тестовый режим)</h3>
            <p className="small muted">У всех тестовых пользователей пароль <b>demo123</b>. Ученики: s001–s100, родители: p001…, тренеры: coach1–coach4.</p>
            <div className="demo-list">
              {demo.map((d) => (
                <form key={d.id} action={demoLogin}>
                  <input type="hidden" name="login" value={d.login} />
                  <button className="btn secondary block sm" type="submit" title={d.name}>{label[d.login] ?? d.login}</button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
