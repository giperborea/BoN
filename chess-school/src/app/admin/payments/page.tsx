import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, fmtRub } from "@/lib/format";

export default async function Payments() {
  await requireUser(["ADMIN"]);
  const list = await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { student: true, createdBy: true } });
  const total = list.reduce((a, p) => a + p.amountRub, 0);
  return (
    <>
      <div className="page-head"><h1>💳 Оплаты</h1><span className="badge">последние {list.length} · {fmtRub(total)}</span></div>
      <p className="small muted">Оплаты вносятся вручную из журнала или карточки ученика. Каждые 10 оплаченных занятий = 10 паков карточек ученику.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Дата</th><th>Ученик</th><th className="num">Сумма</th><th className="num">Занятий</th><th className="num">Паков</th><th>Внёс</th><th>Комментарий</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="nowrap">{fmtDateTime(p.createdAt)}</td>
                <td><Link href={`/students/${p.studentId}?tab=payments`}>{p.student.name}</Link></td>
                <td className="num">{fmtRub(p.amountRub)}</td><td className="num">{p.lessons}</td><td className="num">{p.packs}</td>
                <td className="small">{p.createdBy?.name ?? "—"}</td><td className="small">{p.comment ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
