import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, fmtRub, toLocalInput } from "@/lib/format";
import { DEFAULT_LESSON_PRICE, LEDGER_REASON_LABEL, LESSON_STATUS_LABEL, STUDY_CATEGORY_LABEL } from "@/lib/config";
import { levelInfo } from "@/lib/game";
import { PaymentForm } from "@/components/PaymentForm";
import { ActionForm } from "@/components/ActionForm";
import { LessonActions } from "@/components/LessonActions";
import { Grade } from "@/components/StudyList";
import { adjustBalanceAction, scheduleLessonAction, updateStudentAction } from "@/app/actions/journal";

const TABS = [
  ["overview", "Обзор"], ["lessons", "Занятия"], ["reschedules", "Переносы"], ["payments", "Оплаты"],
  ["ledger", "Движение баланса"], ["studies", "Студии и ДЗ"], ["game", "Игра и ачивки"],
] as const;

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const u = await requireUser(["COACH"]);
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const s = await db.user.findUnique({ where: { id }, include: { coach: true, parent: true } });
  if (!s || s.role !== "STUDENT" || (u.role !== "ADMIN" && s.coachId !== u.id)) notFound();
  const isAdmin = u.role === "ADMIN";
  const [lessons, reschedules, payments, ledger, studies, chars, ach, cards, coaches, parents] = await Promise.all([
    db.lesson.findMany({ where: { studentId: id }, orderBy: { scheduledAt: "desc" }, include: { coach: true, _count: { select: { studies: true } } } }),
    db.reschedule.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" }, include: { initiatedBy: true } }),
    db.payment.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" }, include: { createdBy: true } }),
    db.balanceTx.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" } }),
    db.study.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" } }),
    db.character.findMany({ where: { userId: id }, include: { gm: true }, orderBy: { createdAt: "desc" } }),
    db.userAchievement.findMany({ where: { userId: id }, include: { achievement: true }, orderBy: { earnedAt: "desc" } }),
    db.collectionItem.count({ where: { userId: id, collectedAt: { not: null } } }),
    isAdmin ? db.user.findMany({ where: { role: "COACH" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isAdmin ? db.user.findMany({ where: { role: "PARENT" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const done = lessons.filter((l) => l.status === "STARTED" || l.status === "DONE").length;
  const upcoming = lessons.filter((l) => l.status === "SCHEDULED").reverse();
  const hw = studies.filter((x) => x.category === "HOMEWORK" && x.grade);
  const avg = hw.length ? (hw.reduce((a, x) => a + (x.grade ?? 0), 0) / hw.length).toFixed(1) : "—";
  const late = reschedules.filter((r) => r.charged).length;
  const active = chars.find((c) => c.active);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href={isAdmin ? "/admin" : "/coach/students"}>← {isAdmin ? "Журнал" : "Ученики"}</Link></div>
          <h1 style={{ margin: 0 }}>{s.name}</h1>
          <div className="small muted">
            {s.login} · тренер {s.coach?.name ?? "—"} · родитель {s.parent ? `${s.parent.name} (${s.parent.login})` : "—"} ·{" "}
            {s.lichessUsername ? <a href={`https://lichess.org/@/${s.lichessUsername}`} target="_blank" rel="noreferrer">Lichess @{s.lichessUsername}</a> : <span className="badge warn">Lichess не подключён</span>}
            {" · "}{s.consentAt ? <span className="badge ok">согласие ПД {s.consentType === "PARENT" ? `(родитель: ${s.consentParentName})` : ""} {fmtDate(s.consentAt)}</span> : <span className="badge warn">нет согласия ПД</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-4 mb">
        <div className="stat"><div className="label">Баланс</div><div className={`value ${s.lessonBalance <= 0 ? "neg" : ""}`}>{s.lessonBalance}</div><div className="sub">занятий</div></div>
        <div className="stat"><div className="label">Пройдено</div><div className="value">{done}</div><div className="sub">запланировано: {upcoming.length}</div></div>
        <div className="stat"><div className="label">Переносы</div><div className="value">{reschedules.length}</div><div className="sub">со списанием: <b className="neg">{late}</b></div></div>
        <div className="stat"><div className="label">Средняя за ДЗ</div><div className="value">{avg}</div><div className="sub">оценок: {hw.length}</div></div>
      </div>
      <div className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`?tab=${k}`} className={tab === k ? "active" : ""}>{l}</Link>)}</div>

      {tab === "overview" && (
        <div className="grid grid-2">
          <div>
            <div className="card" style={{ overflow: "visible" }}>
              <h2>Ближайшие занятия</h2>
              {upcoming.length === 0 ? <div className="muted">Нет</div> : upcoming.slice(0, 6).map((l) => (
                <div key={l.id} className="row between" style={{ padding: "6px 0", position: "relative" }}>
                  <span><b>{fmtDateTime(l.scheduledAt)}</b> <span className="small muted">{l.coach.name}</span></span>
                  <LessonActions l={l} compact />
                </div>
              ))}
            </div>
            <div className="card">
              <h2>Запланировать</h2>
              <ActionForm action={scheduleLessonAction} className="stack" submit="Запланировать" resetOnOk>
                <input type="hidden" name="studentId" value={s.id} />
                {isAdmin && <input type="hidden" name="coachId" value={s.coachId ?? ""} />}
                <div className="form-grid">
                  <label className="field">Дата и время (МСК)<input type="datetime-local" name="scheduledAt" required defaultValue={toLocalInput(new Date(Date.now() + 86_400_000))} /></label>
                  <label className="field">Повтор<select name="repeat" defaultValue="1"><option value="1">разово</option><option value="4">4 недели</option><option value="8">8 недель</option></select></label>
                </div>
              </ActionForm>
            </div>
          </div>
          <div>
            {isAdmin && (
              <div className="card">
                <h2>💳 Внести оплату</h2>
                <PaymentForm studentId={s.id} price={DEFAULT_LESSON_PRICE} />
              </div>
            )}
            {isAdmin && (
              <div className="card">
                <h2>Корректировка баланса</h2>
                <ActionForm action={adjustBalanceAction} className="stack" submit="Применить" submitClass="btn secondary" resetOnOk>
                  <input type="hidden" name="studentId" value={s.id} />
                  <div className="form-grid">
                    <label className="field">Изменение<input name="delta" type="number" placeholder="-1 или 2" /></label>
                    <label className="field">Причина<input name="comment" placeholder="Обязательно" /></label>
                  </div>
                </ActionForm>
              </div>
            )}
            {isAdmin && (
              <div className="card">
                <h2>Данные ученика</h2>
                <ActionForm action={updateStudentAction} className="stack" submit="Сохранить" submitClass="btn secondary">
                  <input type="hidden" name="studentId" value={s.id} />
                  <label className="field">Тренер<select name="coachId" defaultValue={s.coachId ?? ""}><option value="">—</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label className="field">Родитель<select name="parentId" defaultValue={s.parentId ?? ""}><option value="">—</option>{parents.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.login})</option>)}</select></label>
                  <label className="field">Заметки<textarea name="notes" defaultValue={s.notes ?? ""} /></label>
                </ActionForm>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "lessons" && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Дата</th><th>Тренер</th><th>Статус</th><th>Старт</th><th className="num">Студий</th><th></th></tr></thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">{fmtDateTime(l.scheduledAt)}</td><td className="small">{l.coach.name}</td>
                  <td><span className={`badge ${l.status === "DONE" ? "ok" : l.status === "CANCELLED" ? "danger" : l.status === "STARTED" ? "accent" : ""}`}>{LESSON_STATUS_LABEL[l.status]}</span></td>
                  <td className="small">{l.startedAt ? fmtDateTime(l.startedAt) : "—"}</td>
                  <td className="num">{l._count.studies}</td>
                  <td className="right"><Link href={`/coach/lessons/${l.id}`} className="small">открыть</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reschedules" && (
        <>
          <p className="small muted">Правило: перенос или отмена менее чем за 2 часа до начала — занятие списывается автоматически.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Когда</th><th>Действие</th><th>Было</th><th>Стало</th><th className="num">Часов до начала</th><th>Списание</th><th>Кто</th><th>Причина</th></tr></thead>
              <tbody>
                {reschedules.length === 0 && <tr><td colSpan={8} className="empty">Переносов не было</td></tr>}
                {reschedules.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap small">{fmtDateTime(r.createdAt)}</td>
                    <td>{r.kind === "CANCEL" ? "Отмена" : "Перенос"}</td>
                    <td className="nowrap small">{fmtDateTime(r.fromTime)}</td>
                    <td className="nowrap small">{r.toTime ? fmtDateTime(r.toTime) : "—"}</td>
                    <td className="num">{r.hoursBefore}</td>
                    <td>{r.charged ? <span className="badge danger">−1 занятие</span> : <span className="badge ok">нет</span>}</td>
                    <td className="small">{r.initiatedBy?.name ?? "—"}</td>
                    <td className="small">{r.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "payments" && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Дата</th><th className="num">Сумма</th><th className="num">Занятий</th><th className="num">Паков</th><th>Внёс</th><th>Комментарий</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={6} className="empty">Оплат нет</td></tr>}
              {payments.map((p) => (
                <tr key={p.id}><td className="nowrap">{fmtDateTime(p.createdAt)}</td><td className="num">{fmtRub(p.amountRub)}</td><td className="num">{p.lessons}</td><td className="num">{p.packs}</td><td className="small">{p.createdBy?.name ?? "—"}</td><td className="small">{p.comment ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ledger" && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Дата</th><th>Операция</th><th className="num">Изменение</th><th className="num">Баланс</th><th>Комментарий</th></tr></thead>
            <tbody>
              {ledger.map((t) => (
                <tr key={t.id}><td className="nowrap">{fmtDateTime(t.createdAt)}</td><td>{LEDGER_REASON_LABEL[t.reason]}</td><td className={`num ${t.delta > 0 ? "pos" : "neg"}`}>{t.delta > 0 ? "+" : ""}{t.delta}</td><td className="num"><b>{t.balance}</b></td><td className="small">{t.comment ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "studies" && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Дата</th><th>Группа</th><th>Студия</th><th>Оценка</th><th>Комментарий</th></tr></thead>
            <tbody>
              {studies.length === 0 && <tr><td colSpan={5} className="empty">Студий нет</td></tr>}
              {studies.map((x) => (
                <tr key={x.id}>
                  <td className="nowrap small">{fmtDate(x.createdAt)}</td><td>{STUDY_CATEGORY_LABEL[x.category]}</td>
                  <td><a href={x.url} target="_blank" rel="noreferrer">{x.name} ↗</a></td>
                  <td>{x.category === "HOMEWORK" ? <Grade g={x.grade} /> : x.category === "TODO" ? (x.doneAt ? "✓" : "—") : ""}</td>
                  <td className="small">{x.gradeComment ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "game" && (
        <div className="grid grid-2">
          <div className="card">
            <h2>♞ Персонажи</h2>
            {chars.length === 0 ? <div className="muted">Не выбран</div> : chars.map((c) => (
              <div key={c.id} className="row between" style={{ padding: "4px 0" }}>
                <span>{c.active ? "▶ " : ""}<b>{c.gm.name}</b> <span className="small muted">ур. {levelInfo(c.xp).level}</span></span>
                <span className="small">рейтинг <b>{c.rating}</b> (пик {c.peak}) · ✅{c.solved} ❌{c.failed}</span>
              </div>
            ))}
            <div className="small muted mt">Карточек собрано: {cards} / 200 · паков: {s.packs} · осколков: {s.shards}{active ? ` · текущий: ${active.gm.name}` : ""}</div>
          </div>
          <div className="card">
            <h2>🏆 Достижения ({ach.length})</h2>
            {ach.map((a) => <div key={a.id} className="row between small" style={{ padding: "3px 0" }}><span>{a.achievement.icon} {a.achievement.title}</span><span className="muted">{fmtDate(a.earnedAt)}</span></div>)}
          </div>
        </div>
      )}
    </>
  );
}
