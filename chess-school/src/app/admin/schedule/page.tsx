import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey, fmtTime } from "@/lib/format";
import { LESSON_STATUS_LABEL } from "@/lib/config";
import { LessonActions } from "@/components/LessonActions";

export default async function Schedule({ searchParams }: { searchParams: Promise<{ w?: string; coach?: string }> }) {
  await requireUser(["ADMIN"]);
  const { w = "0", coach = "" } = await searchParams;
  const offset = Number(w) || 0;
  const now = new Date();
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  const end = new Date(monday.getTime() + 7 * 86_400_000);
  const [lessons, coaches] = await Promise.all([
    db.lesson.findMany({ where: { scheduledAt: { gte: monday, lt: end }, ...(coach ? { coachId: coach } : {}) }, orderBy: { scheduledAt: "asc" }, include: { student: true, coach: true } }),
    db.user.findMany({ where: { role: "COACH" }, orderBy: { name: "asc" } }),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86_400_000));
  const fmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Moscow" });
  return (
    <>
      <div className="page-head">
        <h1>📅 Расписание</h1>
        <div className="row">
          <Link className="btn secondary sm" href={`?w=${offset - 1}&coach=${coach}`}>← неделя</Link>
          <Link className="btn secondary sm" href={`?w=0&coach=${coach}`}>сегодня</Link>
          <Link className="btn secondary sm" href={`?w=${offset + 1}&coach=${coach}`}>неделя →</Link>
        </div>
      </div>
      <div className="tabs">
        <Link href={`?w=${offset}`} className={!coach ? "active" : ""}>Все тренеры</Link>
        {coaches.map((c) => <Link key={c.id} href={`?w=${offset}&coach=${c.id}`} className={coach === c.id ? "active" : ""}>{c.name}</Link>)}
      </div>
      <div className="stack">
        {days.map((d) => {
          const list = lessons.filter((l) => dayKey(l.scheduledAt) === dayKey(d));
          return (
            <div className="card" key={d.toISOString()} style={{ marginTop: 0, overflow: "visible" }}>
              <h3 className={dayKey(d) === dayKey(now) ? "" : "muted"}>{fmt.format(d)} {dayKey(d) === dayKey(now) && <span className="badge accent">сегодня</span>} <span className="small muted">· {list.length}</span></h3>
              {list.map((l) => (
                <div key={l.id} className="row between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", position: "relative" }}>
                  <div>
                    <b>{fmtTime(l.scheduledAt)}</b> · <Link href={`/students/${l.studentId}`}>{l.student.name}</Link> <span className="small muted">· {l.coach.name}</span>{" "}
                    <span className={`badge ${l.status === "DONE" ? "ok" : l.status === "CANCELLED" ? "danger" : l.status === "STARTED" ? "accent" : ""}`}>{LESSON_STATUS_LABEL[l.status]}</span>
                  </div>
                  <LessonActions l={l} compact />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
