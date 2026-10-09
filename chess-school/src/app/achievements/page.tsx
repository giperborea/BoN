import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/achievements";
import { dayKey, fmtDate, fmtDateTime } from "@/lib/format";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export default async function AchievementsPage({ searchParams }: { searchParams: Promise<{ view?: string; m?: string }> }) {
  const u = await requireUser(["STUDENT"]);
  const { view = "calendar", m } = await searchParams;
  const [all, mine] = await Promise.all([
    db.achievement.findMany({ orderBy: { sort: "asc" } }),
    db.userAchievement.findMany({ where: { userId: u.id }, include: { achievement: true }, orderBy: { earnedAt: "desc" } }),
  ]);
  const got = new Map(mine.map((x) => [x.achievementId, x]));
  const packsEarned = mine.reduce((s, x) => s + x.achievement.packs, 0);

  // Календарь
  const now = new Date();
  const [y, mo] = (m ?? dayKey(now).slice(0, 7)).split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const startDow = (first.getUTCDay() + 6) % 7; // пн = 0
  const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const byDay = new Map<string, typeof mine>();
  for (const x of mine) { const k = dayKey(x.earnedAt); byDay.set(k, [...(byDay.get(k) ?? []), x]); }
  const cells: { key: string; n: number; out: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(y, mo - 1, 1 - startDow + i));
    cells.push({ key: d.toISOString().slice(0, 10), n: d.getUTCDate(), out: d.getUTCMonth() !== mo - 1 });
  }
  if (cells.slice(35).every((c) => c.out)) cells.splice(35);
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const today = dayKey(now);
  const monthCount = mine.filter((x) => dayKey(x.earnedAt).startsWith(`${y}-${String(mo).padStart(2, "0")}`)).length;
  void daysIn;

  return (
    <>
      <div className="page-head"><h1>🏆 Достижения</h1></div>
      <div className="grid grid-3 mb">
        <div className="stat"><div className="label">Получено</div><div className="value">{mine.length} / {all.length}</div></div>
        <div className="stat"><div className="label">Паков за достижения</div><div className="value">{packsEarned}</div></div>
        <div className="stat"><div className="label">Последнее</div><div className="value" style={{ fontSize: 18 }}>{mine[0] ? `${mine[0].achievement.icon} ${mine[0].achievement.title}` : "—"}</div><div className="sub">{mine[0] ? fmtDate(mine[0].earnedAt) : ""}</div></div>
      </div>
      <div className="tabs">
        <Link href="?view=calendar" className={view === "calendar" ? "active" : ""}>Календарь</Link>
        <Link href="?view=journal" className={view === "journal" ? "active" : ""}>Журнал</Link>
        <Link href="?view=all" className={view === "all" ? "active" : ""}>Все достижения</Link>
      </div>

      {view === "calendar" && (
        <div className="card">
          <div className="row between mb">
            <Link className="btn secondary sm" href={`?view=calendar&m=${prev}`}>←</Link>
            <h2 style={{ margin: 0 }}>{MONTHS[mo - 1]} {y} <span className="small muted">· {monthCount} получено</span></h2>
            <Link className="btn secondary sm" href={`?view=calendar&m=${next}`}>→</Link>
          </div>
          <div className="cal">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <div key={d} className="dow">{d}</div>)}
            {cells.map((c) => (
              <div key={c.key} className={`day ${c.out ? "out" : ""} ${c.key === today ? "today" : ""}`}>
                <div className="n">{c.n}</div>
                <div className="ach">
                  {(byDay.get(c.key) ?? []).map((x) => <span key={x.id} title={`${x.achievement.title} — ${fmtDateTime(x.earnedAt)}`}>{x.achievement.icon}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "journal" && (
        <div className="card">
          {mine.length === 0 ? <div className="empty">Пока нет достижений — решайте задачи в игре!</div> : mine.map((x) => (
            <div key={x.id} className="ach-item">
              <div className="ach-icon">{x.achievement.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="t"><b>{x.achievement.title}</b></div>
                <div className="small muted">{x.achievement.description}</div>
              </div>
              <div className="right">
                <div className="small">{fmtDateTime(x.earnedAt)}</div>
                {x.achievement.packs > 0 && <span className="badge accent">+{x.achievement.packs} 📦</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "all" && Object.keys(CATEGORY_LABEL).map((cat) => {
        const list = all.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <div className="card" key={cat}>
            <h2>{CATEGORY_LABEL[cat]}</h2>
            {list.map((a) => {
              const g = got.get(a.id);
              return (
                <div key={a.id} className={`ach-item ${g ? "" : "locked"}`}>
                  <div className="ach-icon">{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="t"><b>{a.title}</b></div>
                    <div className="small muted">{a.description}</div>
                  </div>
                  <div className="right">
                    {g ? <span className="badge ok">✓ {fmtDate(g.earnedAt)}</span> : <span className="badge">не получено</span>}
                    {a.packs > 0 && <div><span className="badge accent" style={{ marginTop: 4 }}>+{a.packs} 📦</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
