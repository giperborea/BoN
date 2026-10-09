import { fmtDate } from "@/lib/format";
import { STUDY_CATEGORY_LABEL } from "@/lib/config";

export type StudyRow = {
  id: string; name: string; url: string; category: string; grade: number | null; gradeComment: string | null;
  createdAt: Date; doneAt: Date | null; coach?: { name: string } | null;
};

export function Grade({ g }: { g: number | null }) {
  if (!g) return <span className="badge warn">на проверке</span>;
  return <span className={`grade g${g}`}>{g}</span>;
}

export function StudyList({ studies, empty = "Нет студий" }: { studies: StudyRow[]; empty?: string }) {
  if (!studies.length) return <div className="empty">{empty}</div>;
  return (
    <div className="stack">
      {studies.map((s) => (
        <div key={s.id} className="row between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <a href={s.url} target="_blank" rel="noreferrer"><b>{s.name}</b> ↗</a>
            <div className="tiny muted">{STUDY_CATEGORY_LABEL[s.category]} · {fmtDate(s.createdAt)}{s.coach ? ` · ${s.coach.name}` : ""}</div>
            {s.gradeComment && <div className="small" style={{ marginTop: 2 }}>💬 {s.gradeComment}</div>}
          </div>
          {s.category === "HOMEWORK" && <Grade g={s.grade} />}
          {s.category === "TODO" && (s.doneAt ? <span className="badge ok">доделано</span> : <span className="badge warn">доделать</span>)}
        </div>
      ))}
    </div>
  );
}
