"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Показывает одноразовое сообщение из ?flash=… (после действий, которые меняют страницу). */
export function Flash() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [msg, setMsg] = useState<{ text: string; kind: string } | null>(null);
  useEffect(() => {
    const text = sp.get("flash");
    if (!text) return;
    setMsg({ text, kind: sp.get("fk") ?? "ok" });
    const rest = new URLSearchParams(sp);
    rest.delete("flash"); rest.delete("fk");
    router.replace(path + (rest.size ? `?${rest}` : ""), { scroll: false });
  }, [sp, router, path]);
  if (!msg) return null;
  return (
    <div className={`alert ${msg.kind === "error" ? "error" : msg.kind === "warn" ? "error" : "ok"}`} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span>{msg.text}</span>
      <button className="btn sm ghost" onClick={() => setMsg(null)}>✕</button>
    </div>
  );
}
