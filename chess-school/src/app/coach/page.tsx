import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, fmtTime, dayKey, toLocalInput } from "@/lib/format";
import { LESSON_STATUS_LABEL } from "@/lib/config";
import { LessonActions } from "@/components/LessonActions";
import { ActionForm } from "@/components/ActionForm";
import { scheduleLessonAction } from "@/app/actions/journal";

export default async function CoachHome() {
  const u = await requireUser(["COACH"]);
  const now = new Date();
  const scope = u.role === "ADMIN" ? {} : { coachId: u.id };
  const [active, upcoming, recent, students, toGrade] = await Promise.all([
    db.lesson.findMany({ where: { ...scope, status: "STARTED" }, include: { student: true, coach: true } }),
    db.lesson.findMany({ where: { ...scope, status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime() - 6 * 3_600_000) } }, orderBy: { scheduledAt: "asc" }, take: 30, include: { student: true, coach: true } }),
    db.lesson.findMany({ where: { ...scope, status: "DONE" }, orderBy: { scheduledAt: "desc" }, take: 8, include: { student: true, _count: { select: { studies: true } } } }),
    db.user.findMany({ where: { role: "STUDENT", ...(u.role === "ADMIN" ? {} : { coachId: u.id }) }, orderBy: { name: "asc" } }),
    db.study.count({ where: { ...scope, category: "HOMEWORK", grade: null } }),
  ]);
  const today = dayKey(now);
  const groups = new Map<string, typeof upcoming>();
  for (const l of upcoming) { const k = dayKey(l.scheduledAt); groups.set(k, [...(groups.get(k) ?? []), l]); }
  return (
    <>
      <div className="page-head">
        <h1>📅 Мои уроки</h1>
        <div className="row">
          {toGrade > 0 && <Link href="/coach/homework" className="badge warn">✍️ Домашек на проверке: {toGrade}</Link>}
          {u.lichessUsername && <span className="badge">Lichess: @{u.lichessUsername}</span>}
        </div>
      </div>
      {active.length > 0 && (
        <div className="card mb" style={{ borderColor: "var(--ok)" }}>
          <h2>🟢 Идёт сейчас</h2>
          {active.map((l) => (
            <div key={l.id} className="row between" style={{ padding: "6px 0" }}>
              <div><b>{l.student.name}</b> <span className="muted small">начат в {fmtTime(l.startedAt!)}</span></div>
              <LessonActions l={l} />
            </div>
          ))}
        </div>
      )}
      <div className="grid split">
        <div>
          {groups.size === 0 && <div className="card empty">Нет запланированных уроков</div>}
          {[...groups.entries()].map(([day, list]) => (
            <div className="card" key={day} style={{ overflow: "visible" }}>
              <h2>{day === today ? "Сегодня" : new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Moscow" }).format(list[0].scheduledAt)}</h2>
              {list.map((l) => (
                <div key={l.id} className="row between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", position: "relative" }}>
                  <div>
                    <b>{fmtTime(l.scheduledAt)}</b> · <Link href={`/students/${l.studentId}`}>{l.student.name}</Link>
                    <span className={`badge ${l.student.lessonBalance <= 0 ? "danger" : ""}`} style={{ marginLeft: 6 }}>баланс {l.student.lessonBalance}</span>
                    {u.role === "ADMIN" && <span className="tiny muted"> · {l.coach.name}</span>}
                    {l.topic && <div className="tiny muted">{l.topic}</div>}
                  </div>
                  <LessonActions l={l} compact />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="card">
            <h2>Запланировать урок</h2>
            <ActionForm action={scheduleLessonAction} className="stack" submit="Запланировать" resetOnOk>
              <label className="field">Ученик
                <select name="studentId" required>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </label>
              <label className="field">Дата и время (МСК)<input type="datetime-local" name="scheduledAt" required defaultValue={toLocalInput(new Date(now.getTime() + 86_400_000))} /></label>
              <div className="form-grid">
                <label className="field">Длительность<select name="durationMin" defaultValue="60"><option>45</option><option>60</option><option>90</option></select></label>
                <label className="field">Повторять<select name="repeat" defaultValue="1"><option value="1">разово</option><option value="4">4 недели</option><option value="8">8 недель</option></select></label>
              </div>
              <label className="field">Тема<input name="topic" placeholder="необязательно" /></label>
            </ActionForm>
          </div>
          <div className="card">
            <h2>Недавно проведённые</h2>
            {recent.length === 0 ? <div className="muted small">Пока нет</div> : recent.map((l) => (
              <div key={l.id} className="row between small" style={{ padding: "4px 0" }}>
                <span>{fmtDateTime(l.scheduledAt)} · {l.student.name}</span>
                <Link href={`/coach/lessons/${l.id}`}>студий: {l._count.studies}</Link>
              </div>
            ))}
            <div className="tiny muted mt">Статусы: {Object.values(LESSON_STATUS_LABEL).join(" · ")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
