import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDate, plural } from "@/lib/format";
import { levelInfo } from "@/lib/game";
import { LEDGER_REASON_LABEL } from "@/lib/config";
import { StudyList } from "./StudyList";
import { GmAvatar } from "./GmAvatar";

/** Сводка по ученику: для кабинета ученика и родителя. */
export async function StudentOverview({ studentId, forParent = false }: { studentId: string; forParent?: boolean }) {
  const s = await db.user.findUniqueOrThrow({ where: { id: studentId }, include: { coach: true } });
  const now = new Date();
  const [upcoming, studies, ch, ach, cards, done, ledger, reschedules] = await Promise.all([
    db.lesson.findMany({ where: { studentId, status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime() - 3_600_000) } }, orderBy: { scheduledAt: "asc" }, take: 3, include: { coach: true } }),
    db.study.findMany({ where: { studentId }, orderBy: { createdAt: "desc" }, include: { coach: true } }),
    db.character.findFirst({ where: { userId: studentId, active: true }, include: { gm: true } }),
    db.userAchievement.findMany({ where: { userId: studentId }, include: { achievement: true }, orderBy: { earnedAt: "desc" }, take: 5 }),
    db.collectionItem.count({ where: { userId: studentId, collectedAt: { not: null } } }),
    db.lesson.count({ where: { studentId, status: { in: ["STARTED", "DONE"] } } }),
    forParent ? db.balanceTx.findMany({ where: { studentId }, orderBy: { createdAt: "desc" }, take: 8 }) : Promise.resolve([]),
    forParent ? db.reschedule.findMany({ where: { studentId }, orderBy: { createdAt: "desc" }, take: 5 }) : Promise.resolve([]),
  ]);
  const hw = studies.filter((x) => x.category === "HOMEWORK");
  const graded = hw.filter((x) => x.grade);
  const avg = graded.length ? (graded.reduce((a, x) => a + (x.grade ?? 0), 0) / graded.length).toFixed(1) : "—";
  const lv = ch ? levelInfo(ch.xp) : null;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid grid-4">
        <div className="stat"><div className="label">Баланс занятий</div><div className={`value ${s.lessonBalance <= 0 ? "neg" : ""}`}>{s.lessonBalance}</div><div className="sub">{s.lessonBalance <= 0 ? "нужно пополнить" : plural(s.lessonBalance, "занятие", "занятия", "занятий") + " осталось"}</div></div>
        <div className="stat"><div className="label">Пройдено занятий</div><div className="value">{done}</div><div className="sub">тренер: {s.coach?.name ?? "—"}</div></div>
        <div className="stat"><div className="label">Средняя оценка ДЗ</div><div className="value">{avg}</div><div className="sub">проверено {graded.length} из {hw.length}</div></div>
        <div className="stat"><div className="label">Карточек</div><div className="value">{cards} / 200</div><div className="sub">{forParent ? "" : <Link href="/cards">паков: {s.packs} →</Link>}</div></div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h2>📅 Ближайшие занятия</h2>
          {upcoming.length === 0 ? <div className="muted">Нет запланированных занятий</div> : upcoming.map((l) => (
            <div key={l.id} className="row between" style={{ padding: "6px 0" }}>
              <b>{fmtDateTime(l.scheduledAt)}</b><span className="muted small">{l.coach.name} · {l.durationMin} мин</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>♞ Персонаж</h2>
          {ch && lv ? (
            <div className="hero">
              <div className="ava"><GmAvatar gm={ch.gm} /></div>
              <div style={{ flex: 1 }}>
                <b>{ch.gm.name}</b>
                <div className="rating-big">{ch.rating}</div>
                <div className="small muted">{lv.icon} Уровень {lv.level} · {lv.title} · решено {ch.solved}</div>
                {!forParent && <Link className="btn sm" style={{ marginTop: 6 }} href="/game">Играть →</Link>}
              </div>
            </div>
          ) : <div className="muted">Гроссмейстер ещё не выбран. {!forParent && <Link href="/game">Выбрать →</Link>}</div>}
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="row between"><h2>✍️ Домашка</h2>{!forParent && <Link href="/student/studies?c=HOMEWORK" className="small">все →</Link>}</div>
          <StudyList studies={hw.slice(0, 5)} empty="Домашних заданий пока нет" />
        </div>
        <div className="card">
          <h2>🏆 Последние достижения</h2>
          {ach.length === 0 ? <div className="muted">Пока нет</div> : ach.map((a) => (
            <div key={a.id} className="row between" style={{ padding: "4px 0" }}>
              <span>{a.achievement.icon} {a.achievement.title}</span><span className="small muted">{fmtDate(a.earnedAt)}</span>
            </div>
          ))}
          {!forParent && <Link href="/achievements" className="small">Календарь достижений →</Link>}
        </div>
      </div>
      {forParent && (
        <div className="grid grid-2">
          <div className="card">
            <h2>💳 Движение баланса</h2>
            {ledger.map((t) => (
              <div key={t.id} className="row between small" style={{ padding: "4px 0" }}>
                <span>{fmtDateTime(t.createdAt)} · {LEDGER_REASON_LABEL[t.reason]}</span>
                <span className={t.delta > 0 ? "pos" : "neg"}>{t.delta > 0 ? "+" : ""}{t.delta} → {t.balance}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>🔁 Переносы</h2>
            {reschedules.length === 0 ? <div className="muted">Переносов не было</div> : reschedules.map((r) => (
              <div key={r.id} className="row between small" style={{ padding: "4px 0" }}>
                <span>{fmtDateTime(r.fromTime)} {r.kind === "CANCEL" ? "отменено" : `→ ${fmtDateTime(r.toTime)}`}</span>
                {r.charged ? <span className="badge danger">списано</span> : <span className="badge ok">без списания</span>}
              </div>
            ))}
            <p className="tiny muted">Перенос или отмена менее чем за 2 часа до начала — занятие списывается.</p>
          </div>
        </div>
      )}
    </div>
  );
}
