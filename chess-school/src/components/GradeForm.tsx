import { gradeAction } from "@/app/actions/journal";

/** Оценка домашки по 5-балльной шкале одним нажатием (с необязательным комментарием). */
export function GradeForm({ studyId, grade, comment }: { studyId: string; grade: number | null; comment?: string | null }) {
  return (
    <form action={gradeAction} className="row" style={{ gap: 6 }}>
      <input type="hidden" name="studyId" value={studyId} />
      <input name="comment" placeholder="Комментарий" defaultValue={comment ?? ""} style={{ width: 170, padding: "6px 8px" }} />
      <div className="grade-btns">
        {[1, 2, 3, 4, 5].map((g) => (
          <button key={g} name="grade" value={g} className={grade === g ? "on" : ""} type="submit" title={`Оценка ${g}`}>{g}</button>
        ))}
      </div>
    </form>
  );
}
