"use client";
import { useActionState, useEffect, useRef } from "react";

type State = { error?: string; ok?: string } | undefined | null;

/** Форма с серверным действием: показывает ошибку/успех и блокирует кнопку на время отправки. */
export function ActionForm({
  action, children, className, submit, submitClass = "btn", resetOnOk = false,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  children: React.ReactNode; className?: string; submit?: string; submitClass?: string; resetOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnOk && state?.ok) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className}>
      {state?.error && <div className="alert error" style={{ width: "100%" }}>{state.error}</div>}
      {state?.ok && <div className="alert ok" style={{ width: "100%" }}>{state.ok}</div>}
      {children}
      {submit && <button className={submitClass} disabled={pending} type="submit">{pending ? "…" : submit}</button>}
    </form>
  );
}
