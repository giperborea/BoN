import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PuzzleEditor } from "@/components/PuzzleEditor";
import { togglePuzzleAction } from "@/app/actions/journal";
import { parseMoves } from "@/lib/puzzles";

export default async function PuzzlesAdmin() {
  await requireUser(["ADMIN"]);
  const [puzzles, stats] = await Promise.all([
    db.puzzle.findMany({ orderBy: [{ rating: "asc" }] }),
    db.puzzleAttempt.groupBy({ by: ["puzzleId", "status"], _count: true }),
  ]);
  const st = new Map<string, { s: number; f: number }>();
  for (const x of stats) {
    const v = st.get(x.puzzleId) ?? { s: 0, f: 0 };
    if (x.status === "SOLVED") v.s += x._count; else if (x.status === "FAILED") v.f += x._count;
    st.set(x.puzzleId, v);
  }
  return (
    <>
      <div className="page-head"><h1>🧩 База задач</h1><span className="badge">{puzzles.length} задач · активных {puzzles.filter((p) => p.active).length}</span></div>
      <details className="card mb" open={puzzles.length === 0}>
        <summary style={{ cursor: "pointer" }}><b>+ Добавить задачу вручную</b></summary>
        <div className="mt"><PuzzleEditor /></div>
      </details>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Код</th><th>Название</th><th>Тема</th><th className="num">Рейтинг</th><th className="num">Ходов</th><th className="num">Решили / ошиблись</th><th>Позиция</th><th></th></tr></thead>
          <tbody>
            {puzzles.map((p) => {
              const s = st.get(p.id) ?? { s: 0, f: 0 };
              const mv = parseMoves(p.moves);
              return (
                <tr key={p.id} style={{ opacity: p.active ? 1 : .5 }}>
                  <td className="small">{p.code}</td>
                  <td><b>{p.title}</b>{p.hint && <div className="tiny muted">💡 {p.hint}</div>}</td>
                  <td className="small">{p.theme}</td>
                  <td className="num">{p.rating}</td>
                  <td className="num">{(mv.length + 1) / 2}</td>
                  <td className="num">{s.s} / {s.f}</td>
                  <td><a className="small" target="_blank" rel="noreferrer" href={`https://lichess.org/analysis/standard/${p.fen.replace(/ /g, "_")}`}>доска ↗</a></td>
                  <td><form action={togglePuzzleAction}><input type="hidden" name="puzzleId" value={p.id} /><button className="btn sm secondary">{p.active ? "Выключить" : "Включить"}</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
