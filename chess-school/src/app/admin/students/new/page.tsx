import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { createStudentAction } from "@/app/actions/journal";

export default async function NewStudent() {
  await requireUser(["ADMIN"]);
  const [coaches, parents] = await Promise.all([
    db.user.findMany({ where: { role: "COACH" }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "PARENT" }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="small muted"><Link href="/admin">← Журнал</Link></div>
      <h1>Новый ученик</h1>
      <ActionForm action={createStudentAction} className="stack" submit="Создать ученика" resetOnOk>
        <div className="card stack">
          <h2>Ученик</h2>
          <div className="form-grid">
            <label className="field">Имя и фамилия<input name="name" required /></label>
            <label className="field">Логин (латиница)<input name="login" required placeholder="ivan.petrov" /></label>
            <label className="field">Пароль<input name="password" placeholder="сгенерируется автоматически" /></label>
            <label className="field">Тренер<select name="coachId">{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <label className="field">Заметки<textarea name="notes" /></label>
          <p className="tiny muted">При первом входе ученик подтвердит согласие на обработку ПД и подключит Lichess.</p>
        </div>
        <div className="card stack">
          <h2>Родитель</h2>
          <label className="field">Существующий родитель<select name="parentId"><option value="">— создать нового или без родителя —</option>{parents.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.login})</option>)}</select></label>
          <div className="form-grid">
            <label className="field">ФИО нового родителя<input name="parentName" /></label>
            <label className="field">Логин родителя<input name="parentLogin" placeholder="по умолчанию: логин-parent" /></label>
            <label className="field">Телефон<input name="parentPhone" /></label>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
