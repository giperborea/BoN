"use client";
import { useState } from "react";
import { ActionForm } from "./ActionForm";
import { addPaymentAction } from "@/app/actions/journal";

export function PaymentForm({ studentId, price }: { studentId: string; price: number }) {
  const [lessons, setLessons] = useState(10);
  return (
    <ActionForm action={addPaymentAction} className="stack" submit="Внести оплату" resetOnOk>
      <input type="hidden" name="studentId" value={studentId} />
      <div className="form-grid">
        <label className="field">Занятий
          <select name="lessons" value={lessons} onChange={(e) => setLessons(Number(e.target.value))}>
            {[1, 4, 8, 10, 12, 16, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">Сумма, ₽<input name="amountRub" type="number" min={0} key={lessons} defaultValue={lessons * price} /></label>
      </div>
      <label className="field">Комментарий<input name="comment" placeholder="Наличные / перевод…" /></label>
      <div className="tiny muted">Ученик получит +{lessons} занятий и +{lessons} паков карточек.</div>
    </ActionForm>
  );
}
