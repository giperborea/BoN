"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openPackAction } from "@/app/actions/cards";
import { GmCard } from "./GmCard";

type Frag = {
  gmId: string; slug: string; name: string; rarity: string; rank: number;
  duplicate: boolean; shards: number; completed: boolean; fragments: number; needed: number;
};

export function PackOpener({ packs }: { packs: number }) {
  const [left, setLeft] = useState(packs);
  const [frags, setFrags] = useState<Frag[] | null>(null);
  const [ach, setAch] = useState<{ title: string; icon: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const open = () => start(async () => {
    setError("");
    const r = await openPackAction();
    if (!("ok" in r)) { setError(r.error ?? "Ошибка"); return; }
    setFrags(r.fragments);
    setAch(r.achievements);
    setLeft((x) => x - 1);
    router.refresh();
  });

  return (
    <div className="card mb">
      <div className="row" style={{ gap: 20, alignItems: "center" }}>
        <div className="pack-box" onClick={() => !pending && left > 0 && open()} style={{ opacity: left > 0 ? 1 : .45 }}>
          <div><div className="big">📦</div>{left > 0 ? "Открыть пак" : "Паков нет"}<div className="small" style={{ fontWeight: 600 }}>осталось: {left}</div></div>
        </div>
        <div className="stack" style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: 0 }}>Паки карточек</h2>
          <div className="small muted">В каждом паке 5 частей карточек. Соберите все части, чтобы получить гроссмейстера. Части уже собранных карточек превращаются в осколки — их можно обменять на нужную часть.</div>
          <div className="small muted">Паки начисляются: <b>10 паков за каждые 10 оплаченных занятий</b> и за достижения в решении тактики.</div>
          <div className="row"><button className="btn lg" onClick={open} disabled={pending || left <= 0}>{pending ? "Открываем…" : "Открыть пак"}</button></div>
          {error && <div className="alert error">{error}</div>}
        </div>
      </div>
      {frags && (
        <>
          <div className="pack-stage" key={JSON.stringify(frags)}>
            {frags.map((f, i) => (
              <div className="pack-frag" key={i}>
                <GmCard
                  gm={{ id: f.gmId, slug: f.slug, name: f.name, rank: f.rank, rarity: f.rarity, worldChampion: false, fragmentsNeeded: f.needed }}
                  extra={
                    <div className="tiny" style={{ marginTop: 4, fontWeight: 700 }}>
                      {f.completed ? <span className="badge ok">Карточка собрана!</span>
                        : f.duplicate ? <span className="badge">Повтор → +{f.shards} оск.</span>
                        : <span className="badge accent">Часть {f.fragments}/{f.needed}</span>}
                    </div>
                  }
                />
              </div>
            ))}
          </div>
          {ach.map((a) => <div key={a.title} className="alert ok">{a.icon} Новое достижение: {a.title}</div>)}
        </>
      )}
    </div>
  );
}
