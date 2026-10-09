import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { GradeForm } from "@/components/GradeForm";
import { Grade } from "@/components/StudyList";

export default async function HomeworkPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const u = await requireUser(["COACH"]);
  const { f = "todo" } = await searchParams;
  const scope = u.role === "ADMIN" ? {} : { coachId: u.id };
  const list = await db.study.findMany({
    where: { ...scope, category: "HOMEWORK", ...(f === "todo" ? { grade: null } : f === "done" ? { grade: { not: null } } : {}) },
    orderBy: { createdAt: f === "todo" ? "asc" : "desc" }, take: 200, include: { student: true, coach: true },
  });
  return (
    <>
      <div className="page-head"><h1>✍️ Проверка домашек</h1></div>
      <div className="tabs">
        <Link href="?f=todo" className={f === "todo" ? "active" : ""}>На проверке</Link>
        <Link href="?f=done" className={f === "done" ? "active" : ""}>Проверенные</Link>
        <Link href="?f=all" className={f === "all" ? "active" : ""}>Все</Link>
      </div>
      <p className="small muted">Откройте студию на Lichess, посмотрите решение ученика и поставьте оценку от 1 до 5.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Задано</th><th>Ученик</th><th>Студия</th>{u.role === "ADMIN" && <th>Тренер</th>}<th>Оценка</th><th>Оценить</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="empty">Нет домашек</td></tr>}
            {list.map((s) => (
              <tr key={s.id}>
                <td className="nowrap">{fmtDate(s.createdAt)}</td>
                <td><Link href={`/students/${s.studentId}`}>{s.student.name}</Link></td>
                <td><a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a></td>
                {u.role === "ADMIN" && <td className="small">{s.coach.name}</td>}
                <td><Grade g={s.grade} /></td>
                <td><GradeForm studyId={s.id} grade={s.grade} comment={s.gradeComment} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
