import Link from "next/link";
import { startLessonAction, finishLessonAction, rescheduleAction } from "@/app/actions/journal";
import { ActionForm } from "./ActionForm";
import { toLocalInput } from "@/lib/format";
import { LATE_RESCHEDULE_HOURS } from "@/lib/config";

type L = { id: string; status: string; scheduledAt: Date };

export function LessonActions({ l, compact = false }: { l: L; compact?: boolean }) {
  const hoursBefore = (l.scheduledAt.getTime() - Date.now()) / 3_600_000;
  const late = hoursBefore < LATE_RESCHEDULE_HOURS;
  return (
    <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
      {l.status === "SCHEDULED" && (
        <form action={startLessonAction}>
          <input type="hidden" name="lessonId" value={l.id} />
          <input type="hidden" name="open" value="1" />
          <button className="btn sm ok" title="Списывает 1 занятие с баланса">▶ Начать</button>
        </form>
      )}
      {l.status === "STARTED" && (
        <form action={finishLessonAction}>
          <input type="hidden" name="lessonId" value={l.id} />
          <button className="btn sm">■ Завершить</button>
        </form>
      )}
      {(l.status === "STARTED" || l.status === "DONE") && <Link className="btn sm secondary" href={`/coach/lessons/${l.id}`}>Студии</Link>}
      {l.status === "SCHEDULED" && !compact && <Link className="btn sm ghost" href={`/coach/lessons/${l.id}`}>Открыть</Link>}
      {l.status === "SCHEDULED" && (
        <details className="inline">
          <summary className="btn sm secondary">Перенос / отмена</summary>
          <div className="pop card" style={{ position: "absolute", right: 16, zIndex: 20, width: 320, textAlign: "left" }}>
            {late
              ? <div className="alert error small">До начала меньше {LATE_RESCHEDULE_HOURS} ч — при переносе или отмене занятие будет <b>списано</b>.</div>
              : <div className="alert info small">До начала больше {LATE_RESCHEDULE_HOURS} ч — перенос без списания.</div>}
            <ActionForm action={rescheduleAction} className="stack" submit="Подтвердить" submitClass="btn sm">
              <input type="hidden" name="lessonId" value={l.id} />
              <label className="field">Действие
                <select name="kind" defaultValue="RESCHEDULE"><option value="RESCHEDULE">Перенести</option><option value="CANCEL">Отменить</option></select>
              </label>
              <label className="field">Новое время (для переноса)<input type="datetime-local" name="toTime" defaultValue={toLocalInput(new Date(l.scheduledAt.getTime() + 7 * 86_400_000))} /></label>
              <label className="field">Причина<input name="reason" placeholder="Болезнь, просьба родителя…" /></label>
            </ActionForm>
          </div>
        </details>
      )}
    </div>
  );
}
