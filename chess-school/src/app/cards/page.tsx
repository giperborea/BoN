import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RARITIES, Rarity } from "@/lib/cards";
import { GmCard } from "@/components/GmCard";
import { PackOpener } from "@/components/PackOpener";
import { exchangeAction } from "@/app/actions/cards";

const FILTERS = [
  { k: "all", label: "Все" }, { k: "have", label: "Собранные" }, { k: "progress", label: "В процессе" },
  { k: "none", label: "Нет частей" }, { k: "top50", label: "Топ-50 (игровые)" },
];

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ f?: string; r?: string }> }) {
  const u = await requireUser(["STUDENT"]);
  const { f = "all", r } = await searchParams;
  const [gms, items] = await Promise.all([
    db.grandmaster.findMany({ orderBy: { rank: "asc" } }),
    db.collectionItem.findMany({ where: { userId: u.id } }),
  ]);
  const byGm = new Map(items.map((i) => [i.gmId, i]));
  const collected = items.filter((i) => i.collectedAt).length;
  const list = gms.filter((g) => {
    const it = byGm.get(g.id);
    if (r && g.rarity !== r) return false;
    if (f === "have") return !!it?.collectedAt;
    if (f === "progress") return !!it && !it.collectedAt && it.fragments > 0;
    if (f === "none") return !it || (!it.collectedAt && it.fragments === 0);
    if (f === "top50") return g.playable;
    return true;
  });
  const q = (p: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ f, r, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <div className="page-head">
        <h1>🃏 Коллекция гроссмейстеров</h1>
        <Link className="btn secondary sm" href="/leaderboard">Сравнить с другими →</Link>
      </div>
      <div className="grid grid-3 mb">
        <div className="stat"><div className="label">Собрано</div><div className="value">{collected} / {gms.length}</div><div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${(collected / Math.max(1, gms.length)) * 100}%` }} /></div></div>
        <div className="stat"><div className="label">Паков</div><div className="value">{u.packs}</div><div className="sub">доступно к открытию</div></div>
        <div className="stat"><div className="label">Осколки</div><div className="value">{u.shards}</div><div className="sub">из повторных частей</div></div>
      </div>
      <PackOpener packs={u.packs} />
      <div className="card mb small">
        <b>Редкости и обмен:</b>
        <div className="row" style={{ marginTop: 6 }}>
          {(Object.keys(RARITIES) as Rarity[]).map((k) => (
            <span key={k} className="badge" style={{ color: RARITIES[k].color }}>
              {RARITIES[k].label}: {RARITIES[k].fragments} частей · шанс {Math.round(RARITIES[k].dropChance * 100)}% · повтор = {RARITIES[k].shardValue} оск. · обмен = {RARITIES[k].exchangeCost} оск.
            </span>
          ))}
        </div>
      </div>
      <div className="tabs">
        {FILTERS.map((x) => <Link key={x.k} href={q({ f: x.k })} className={f === x.k ? "active" : ""}>{x.label}</Link>)}
      </div>
      <div className="tabs">
        <Link href={q({ r: undefined })} className={!r ? "active" : ""}>Все редкости</Link>
        {(Object.keys(RARITIES) as Rarity[]).map((k) => <Link key={k} href={q({ r: k })} className={r === k ? "active" : ""}>{RARITIES[k].label}</Link>)}
      </div>
      {list.length === 0 ? <div className="empty">Здесь пока пусто</div> : (
        <div className="gm-grid">
          {list.map((g) => {
            const it = byGm.get(g.id);
            const cost = RARITIES[g.rarity as Rarity].exchangeCost;
            return (
              <GmCard key={g.id} gm={g} collected={!!it?.collectedAt} fragments={it?.collectedAt ? undefined : it?.fragments ?? 0}
                extra={
                  <>
                    {it?.collectedAt && g.playable && <div className="tiny" style={{ marginTop: 4 }}><Link href="/game">♞ доступен в игре</Link></div>}
                    {!it?.collectedAt && u.shards >= cost && (
                      <form action={exchangeAction} style={{ marginTop: 6 }}>
                        <input type="hidden" name="gmId" value={g.id} />
                        <button className="btn sm secondary block" title="Обменять осколки на часть">+1 часть за {cost} оск.</button>
                      </form>
                    )}
                  </>
                } />
            );
          })}
        </div>
      )}
    </>
  );
}
