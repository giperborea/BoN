import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export default async function Reschedules({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await requireUser(["ADMIN"]);
  const { f = "all" } = await searchParams;
  const list = await db.reschedule.findMany({
    where: f === "charged" ? { charged: true } : f === "free" ? { charged: false } : {},
    orderBy: { createdAt: "desc" }, take: 300, include: { student: true, initiatedBy: true, lesson: { include: { coach: true } } },
  });
  const charged = list.filter((r) => r.charged).length;
  return (
    <>
      <div className="page-head"><h1>🔁 Журнал переносов</h1><span className="badge danger">со списанием: {charged}</span></div>
      <p className="small muted">Перенос или отмена менее чем за 2 часа до начала — занятие списывается автоматически и фиксируется здесь и в движении баланса ученика.</p>
      <div className="tabs">
        {[["all", "Все"], ["charged", "Со списанием"], ["free", "Без списания"]].map(([k, l]) => <Link key={k} href={`?f=${k}`} className={f === k ? "active" : ""}>{l}</Link>)}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Когда</th><th>Ученик</th><th>Тренер</th><th>Действие</th><th>Было → стало</th><th className="num">Ч до начала</th><th>Списание</th><th>Кто</th><th>Причина</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="empty">Нет записей</td></tr>}
            {list.map((r) => (
              <tr key={r.id}>
                <td className="nowrap small">{fmtDateTime(r.createdAt)}</td>
                <td><Link href={`/students/${r.studentId}?tab=reschedules`}>{r.student.name}</Link></td>
                <td className="small">{r.lesson.coach.name}</td>
                <td>{r.kind === "CANCEL" ? "Отмена" : "Перенос"}</td>
                <td className="small nowrap">{fmtDateTime(r.fromTime)}{r.toTime ? ` → ${fmtDateTime(r.toTime)}` : ""}</td>
                <td className="num">{r.hoursBefore}</td>
                <td>{r.charged ? <span className="badge danger">−1</span> : <span className="badge ok">нет</span>}</td>
                <td className="small">{r.initiatedBy?.name ?? "—"}</td>
                <td className="small">{r.reason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
