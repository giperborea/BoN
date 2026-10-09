import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CoachStudents() {
  const u = await requireUser(["COACH"]);
  const students = await db.user.findMany({
    where: { role: "STUDENT", ...(u.role === "ADMIN" ? {} : { coachId: u.id }) },
    orderBy: { name: "asc" },
    include: { characters: { where: { active: true }, include: { gm: true } }, _count: { select: { lessons: { where: { status: { in: ["STARTED", "DONE"] } } } } } },
  });
  return (
    <>
      <div className="page-head"><h1>👥 Мои ученики</h1><span className="badge">{students.length}</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ученик</th><th>Lichess</th><th className="num">Баланс</th><th className="num">Занятий</th><th>Персонаж</th><th className="num">Рейтинг</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/students/${s.id}`}><b>{s.name}</b></Link></td>
                <td>{s.lichessUsername ? <a href={`https://lichess.org/@/${s.lichessUsername}`} target="_blank" rel="noreferrer">@{s.lichessUsername}</a> : <span className="badge warn">не подключён</span>}</td>
                <td className={`num ${s.lessonBalance <= 0 ? "neg" : ""}`}>{s.lessonBalance}</td>
                <td className="num">{s._count.lessons}</td>
                <td>{s.characters[0]?.gm.name ?? "—"}</td>
                <td className="num">{s.characters[0]?.rating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
