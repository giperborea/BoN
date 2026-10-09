import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { leaderboard } from "@/lib/stats";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const u = await requireUser();
  const { by = "rating" } = await searchParams;
  const rows = await leaderboard();
  if (by === "cards") rows.sort((a, b) => b.cards - a.cards || (b.best?.rating ?? 0) - (a.best?.rating ?? 0));
  const isStudent = u.role === "STUDENT";
  const myPos = rows.findIndex((r) => r.id === u.id);
  return (
    <>
      <div className="page-head">
        <h1>📊 Общий рейтинг игроков</h1>
        {isStudent && myPos >= 0 && <span className="badge accent">Ваше место: {myPos + 1} из {rows.length}</span>}
      </div>
      <div className="tabs">
        <Link href="?by=rating" className={by === "rating" ? "active" : ""}>По лучшему персонажу</Link>
        <Link href="?by=cards" className={by === "cards" ? "active" : ""}>По коллекции</Link>
      </div>
      <p className="small muted">Место определяется по самому рейтинговому персонажу игрока (пиковый рейтинг среди всех его гроссмейстеров).</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th className="num">#</th><th>Игрок</th><th>Лучший персонаж</th><th className="num">Рейтинг</th><th className="num">Ур.</th><th className="num">Задач</th><th className="num">Карточек</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={r.id === u.id ? "lb-me" : ""}>
                <td className="num">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td>
                <td><b>{r.name}</b>{r.lichess && <div className="tiny muted">@{r.lichess}</div>}</td>
                <td>{r.best ? <>{r.best.gm.worldChampion ? "🏆 " : ""}{r.best.gm.name}{!r.best.active && <span className="tiny muted"> (прошлый)</span>}</> : <span className="muted">—</span>}</td>
                <td className="num"><b>{r.best?.rating ?? "—"}</b></td>
                <td className="num">{r.best?.level ?? "—"}</td>
                <td className="num">{r.solved}</td>
                <td className="num">{r.cards}</td>
                <td className="right">{r.id !== u.id && <Link className="btn sm secondary" href={`/compare/${r.id}`}>Сравнить</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
