import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { LESSON_STATUS_LABEL, STUDY_CATEGORY_LABEL } from "@/lib/config";
import { fetchStudies } from "@/lib/lichess";
import { LessonActions } from "@/components/LessonActions";
import { ActionForm } from "@/components/ActionForm";
import { GradeForm } from "@/components/GradeForm";
import { attachStudyAction, removeStudyAction, todoDoneAction } from "@/app/actions/journal";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser(["COACH"]);
  const { id } = await params;
  const l = await db.lesson.findUnique({ where: { id }, include: { student: true, coach: true, studies: { orderBy: { createdAt: "asc" } }, reschedules: { orderBy: { createdAt: "desc" } } } });
  if (!l || (u.role !== "ADMIN" && l.coachId !== u.id)) notFound();
  const { studies, mock, error } = await fetchStudies(l.coach.lichessUsername ?? l.coach.login, l.coach.lichessToken);
  const openTodos = await db.study.findMany({ where: { studentId: l.studentId, category: "TODO", doneAt: null, NOT: { lessonId: l.id } } });
  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/coach">← Уроки</Link></div>
          <h1 style={{ margin: 0 }}>Урок: {l.student.name}</h1>
          <div className="small muted">{fmtDateTime(l.scheduledAt)} · {l.durationMin} мин · тренер {l.coach.name} · <span className="badge">{LESSON_STATUS_LABEL[l.status]}</span> · баланс ученика <b className={l.student.lessonBalance <= 0 ? "neg" : ""}>{l.student.lessonBalance}</b></div>
        </div>
        <div style={{ position: "relative" }}><LessonActions l={l} compact /></div>
      </div>

      <div className="grid split">
        <div>
          <div className="card">
            <h2>Студии урока</h2>
            {l.studies.length === 0 ? <div className="muted">Пока не добавлены. Подтяните студии из Lichess справа.</div> : (
              <div className="stack">
                {(["LESSON", "HOMEWORK", "TODO"] as const).map((cat) => {
                  const list = l.studies.filter((s) => s.category === cat);
                  if (!list.length) return null;
                  return (
                    <div key={cat}>
                      <h3>{STUDY_CATEGORY_LABEL[cat]}</h3>
                      {list.map((s) => (
                        <div key={s.id} className="row between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                          <a href={s.url} target="_blank" rel="noreferrer"><b>{s.name}</b> ↗</a>
                          <div className="row" style={{ gap: 6 }}>
                            {cat === "HOMEWORK" && <GradeForm studyId={s.id} grade={s.grade} comment={s.gradeComment} />}
                            {cat === "TODO" && (
                              <form action={todoDoneAction}><input type="hidden" name="studyId" value={s.id} /><button className={`btn sm ${s.doneAt ? "ok" : "secondary"}`}>{s.doneAt ? "✓ доделано" : "отметить доделанным"}</button></form>
                            )}
                            <form action={removeStudyAction}><input type="hidden" name="studyId" value={s.id} /><button className="btn sm ghost" title="Убрать">✕</button></form>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {openTodos.length > 0 && (
            <div className="card">
              <h2>⏳ Не доделано с прошлых занятий</h2>
              {openTodos.map((s) => (
                <div key={s.id} className="row between" style={{ padding: "4px 0" }}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>
                  <form action={todoDoneAction}><input type="hidden" name="studyId" value={s.id} /><button className="btn sm secondary">отметить доделанным</button></form>
                </div>
              ))}
            </div>
          )}
          {l.reschedules.length > 0 && (
            <div className="card">
              <h2>🔁 История переносов урока</h2>
              {l.reschedules.map((r) => (
                <div key={r.id} className="row between small" style={{ padding: "4px 0" }}>
                  <span>{fmtDateTime(r.createdAt)}: {r.kind === "CANCEL" ? "отмена" : `перенос ${fmtDateTime(r.fromTime)} → ${fmtDateTime(r.toTime)}`} ({r.hoursBefore} ч до начала)</span>
                  {r.charged ? <span className="badge danger">списано</span> : <span className="badge ok">без списания</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="card">
            <h2>Подтянуть студию из Lichess</h2>
            {mock && <div className="alert info small">{error ? `Lichess недоступен (${error}) — ` : ""}Показаны тестовые студии тренера @{l.coach.lichessUsername}. После реального входа через Lichess здесь будут ваши студии.</div>}
            <ActionForm action={attachStudyAction} className="stack" submit="Добавить" resetOnOk>
              <input type="hidden" name="lessonId" value={l.id} />
              <label className="field">Студия
                <select name="study" required>
                  {studies.map((s) => <option key={s.id} value={`${s.id}|${s.name}`}>{s.name}</option>)}
                </select>
              </label>
              <label className="field">Группа
                <select name="category" defaultValue="LESSON">
                  <option value="LESSON">Занятие</option><option value="HOMEWORK">Домашка</option><option value="TODO">Доделать</option>
                </select>
              </label>
            </ActionForm>
          </div>
          <div className="card">
            <h3>Или по ссылке</h3>
            <ActionForm action={attachStudyAction} className="stack" submit="Добавить по ссылке" submitClass="btn secondary" resetOnOk>
              <input type="hidden" name="lessonId" value={l.id} />
              <input name="study" placeholder="https://lichess.org/study/XXXXXXXX" required />
              <input name="name" placeholder="Название (необязательно)" />
              <select name="category" defaultValue="HOMEWORK">
                <option value="LESSON">Занятие</option><option value="HOMEWORK">Домашка</option><option value="TODO">Доделать</option>
              </select>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
