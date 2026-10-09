import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudyList } from "@/components/StudyList";

const GROUPS = [
  { k: "LESSON", label: "📘 Занятие", hint: "Студии, разобранные на уроках" },
  { k: "HOMEWORK", label: "✍️ Домашка", hint: "Задания на дом — тренер проверит и поставит оценку 1–5" },
  { k: "TODO", label: "⏳ Доделать", hint: "То, что не успели на занятии" },
];

export default async function StudiesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const u = await requireUser(["STUDENT"]);
  const { c } = await searchParams;
  const studies = await db.study.findMany({ where: { studentId: u.id }, orderBy: { createdAt: "desc" }, include: { coach: true } });
  const groups = c ? GROUPS.filter((g) => g.k === c) : GROUPS;
  return (
    <>
      <div className="page-head"><h1>📚 Студии Lichess</h1></div>
      <div className="tabs">
        <Link href="?" className={!c ? "active" : ""}>Все</Link>
        {GROUPS.map((g) => <Link key={g.k} href={`?c=${g.k}`} className={c === g.k ? "active" : ""}>{g.label} ({studies.filter((s) => s.category === g.k).length})</Link>)}
      </div>
      <div className={c ? "" : "grid grid-3"}>
        {groups.map((g) => (
          <div className="card" key={g.k} style={{ marginTop: 0 }}>
            <h2>{g.label}</h2>
            <p className="small muted" style={{ marginTop: -6 }}>{g.hint}</p>
            <StudyList studies={studies.filter((s) => s.category === g.k)} />
          </div>
        ))}
      </div>
    </>
  );
}
