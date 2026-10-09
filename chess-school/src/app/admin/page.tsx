import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtRub } from "@/lib/format";
import { DEFAULT_LESSON_PRICE } from "@/lib/config";
import { PaymentForm } from "@/components/PaymentForm";

export default async function AdminJournal({ searchParams }: { searchParams: Promise<{ q?: string; coach?: string; f?: string }> }) {
  await requireUser(["ADMIN"]);
  const { q = "", coach = "", f = "" } = await searchParams;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [students, coaches, payMonth, lessonsMonth, lateMonth] = await Promise.all([
    db.user.findMany({
      where: {
        role: "STUDENT",
        ...(coach ? { coachId: coach } : {}),
        ...(q ? { OR: [{ name: { contains: q } }, { login: { contains: q.toLowerCase() } }, { lichessUsername: { contains: q } }] } : {}),
        ...(f === "debt" ? { lessonBalance: { lte: 0 } } : f === "low" ? { lessonBalance: { lte: 2 } } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        coach: true, parent: true,
        payments: { orderBy: { createdAt: "desc" } },
        reschedules: { select: { charged: true } },
        _count: { select: { lessons: { where: { status: { in: ["STARTED", "DONE"] } } } } },
      },
    }),
    db.user.findMany({ where: { role: "COACH" }, orderBy: { name: "asc" } }),
    db.payment.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amountRub: true, lessons: true } }),
    db.lesson.count({ where: { startedAt: { gte: monthStart } } }),
    db.reschedule.count({ where: { createdAt: { gte: monthStart }, charged: true } }),
  ]);
  const debtors = students.filter((s) => s.lessonBalance <= 0).length;
  const qs = (p: Record<string, string>) => "?" + new URLSearchParams({ q, coach, f, ...p }).toString();
  return (
    <>
      <div className="page-head">
        <h1>📒 Журнал учеников</h1>
        <Link className="btn" href="/admin/students/new">+ Ученик</Link>
      </div>
      <div className="grid grid-4 mb">
        <div className="stat"><div className="label">Учеников</div><div className="value">{students.length}</div><div className="sub">с балансом ≤ 0: <b className="neg">{debtors}</b></div></div>
        <div className="stat"><div className="label">Оплаты за месяц</div><div className="value">{fmtRub(payMonth._sum.amountRub ?? 0)}</div><div className="sub">{payMonth._sum.lessons ?? 0} занятий</div></div>
        <div className="stat"><div className="label">Проведено в месяце</div><div className="value">{lessonsMonth}</div><div className="sub">стартовавших уроков</div></div>
        <div className="stat"><div className="label">Поздние переносы</div><div className="value">{lateMonth}</div><div className="sub"><Link href="/admin/reschedules?f=charged">списано в этом месяце →</Link></div></div>
      </div>
      <form className="row mb" action="/admin">
        <input name="q" defaultValue={q} placeholder="Поиск: имя, логин, Lichess" style={{ maxWidth: 280 }} />
        <select name="coach" defaultValue={coach} style={{ maxWidth: 220 }}>
          <option value="">Все тренеры</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="f" defaultValue={f} style={{ maxWidth: 200 }}>
          <option value="">Все балансы</option><option value="debt">Баланс ≤ 0</option><option value="low">Баланс ≤ 2</option>
        </select>
        <button className="btn secondary">Найти</button>
        {(q || coach || f) && <Link href="/admin" className="small">сбросить</Link>}
      </form>
      <div className="table-wrap" style={{ overflow: "visible" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>Ученик</th><th>Тренер</th><th>Родитель</th><th className="num">Баланс</th><th className="num">Пройдено</th><th className="num">Оплачено</th><th>Посл. оплата</th><th className="num">Переносы</th><th></th></tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const paidLessons = s.payments.reduce((a, p) => a + p.lessons, 0);
                const paidRub = s.payments.reduce((a, p) => a + p.amountRub, 0);
                const late = s.reschedules.filter((r) => r.charged).length;
                return (
                  <tr key={s.id}>
                    <td><Link href={`/students/${s.id}`}><b>{s.name}</b></Link><div className="tiny muted">{s.login}{s.lichessUsername ? ` · @${s.lichessUsername}` : " · Lichess не подключён"}</div></td>
                    <td className="small">{s.coach?.name ?? "—"}</td>
                    <td className="small">{s.parent?.name ?? "—"}</td>
                    <td className={`num ${s.lessonBalance <= 0 ? "neg" : s.lessonBalance <= 2 ? "" : "pos"}`} style={{ fontSize: 16 }}>{s.lessonBalance}</td>
                    <td className="num">{s._count.lessons}</td>
                    <td className="num small">{paidLessons} зан.<div className="tiny muted">{fmtRub(paidRub)}</div></td>
                    <td className="small nowrap">{s.payments[0] ? fmtDate(s.payments[0].createdAt) : "—"}</td>
                    <td className="num"><Link href={`/students/${s.id}?tab=reschedules`} className="btn sm secondary" title="История переносов">🔁 {s.reschedules.length}{late > 0 && <span className="neg"> / {late}</span>}</Link></td>
                    <td className="right" style={{ position: "relative" }}>
                      <details className="inline">
                        <summary className="btn sm">+ Оплата</summary>
                        <div className="pop card" style={{ position: "absolute", right: 0, zIndex: 20, width: 320, textAlign: "left" }}>
                          <b>{s.name}</b>
                          <PaymentForm studentId={s.id} price={DEFAULT_LESSON_PRICE} />
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="tiny muted">Переносы: всего / <span className="neg">со списанием</span> (менее 2 ч до начала). Баланс уменьшается при нажатии тренером «Начать урок».</p>
    </>
  );
}
