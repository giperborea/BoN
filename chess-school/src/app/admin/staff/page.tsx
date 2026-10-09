import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/config";
import { fmtDate } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { createStaffAction } from "@/app/actions/journal";

export default async function Staff() {
  await requireUser(["ADMIN"]);
  const people = await db.user.findMany({
    where: { role: { in: ["ADMIN", "COACH", "PARENT"] } }, orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { students: true, children: true } } },
  });
  return (
    <>
      <div className="page-head"><h1>👥 Тренеры, родители, администраторы</h1></div>
      <div className="grid split">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Имя</th><th>Роль</th><th>Логин</th><th>Lichess</th><th className="num">Учеников / детей</th><th>Согласие ПД</th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b>{p.phone && <div className="tiny muted">{p.phone}</div>}</td>
                  <td><span className="badge">{ROLE_LABEL[p.role]}</span></td>
                  <td className="small">{p.login}</td>
                  <td className="small">{p.lichessUsername ? `@${p.lichessUsername}` : "—"}</td>
                  <td className="num">{p.role === "COACH" ? p._count.students : p.role === "PARENT" ? p._count.children : ""}</td>
                  <td className="small">{p.role === "PARENT" ? (p.consentAt ? fmtDate(p.consentAt) : <span className="badge warn">нет</span>) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h2>Добавить</h2>
          <ActionForm action={createStaffAction} className="stack" submit="Создать" resetOnOk>
            <label className="field">Роль<select name="role"><option value="COACH">Тренер</option><option value="PARENT">Родитель</option><option value="ADMIN">Администратор</option></select></label>
            <label className="field">Имя<input name="name" required /></label>
            <label className="field">Логин<input name="login" required /></label>
            <label className="field">Пароль<input name="password" placeholder="сгенерируется" /></label>
            <label className="field">Телефон<input name="phone" /></label>
          </ActionForm>
          <p className="tiny muted">Привязать родителя к ученику можно в карточке ученика.</p>
        </div>
      </div>
    </>
  );
}
