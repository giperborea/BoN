import { redirect } from "next/navigation";
import { requireUser, needsConsent, homeFor } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { giveConsent } from "@/app/actions/auth";
import { ConsentTypeFields } from "./fields";

export default async function ConsentPage() {
  const u = await requireUser(undefined, { skipGates: true });
  if (!needsConsent(u)) redirect(homeFor(u.role));
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="card">
        <h1>Согласие на обработку данных</h1>
        <p className="muted">
          Добро пожаловать, {u.name}! Перед началом работы нам нужно ваше согласие на обработку персональных данных
          (имя, ник Lichess, результаты занятий и игры) в соответствии с 152-ФЗ.
          <br /><span className="tiny">Текст согласия — тестовый, будет заменён юридически выверенным.</span>
        </p>
        <ActionForm action={giveConsent} className="stack" submit="Продолжить" submitClass="btn lg">
          {u.role === "STUDENT" ? <ConsentTypeFields /> : <input type="hidden" name="type" value="SELF" />}
          <label className="row small"><input type="checkbox" name="agree" /> Я даю согласие на обработку персональных данных</label>
        </ActionForm>
      </div>
    </div>
  );
}
