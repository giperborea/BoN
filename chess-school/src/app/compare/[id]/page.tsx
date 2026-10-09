import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GmCard } from "@/components/GmCard";
import { RARITIES, Rarity } from "@/lib/cards";

export default async function ComparePage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; with?: string }>;
}) {
  const u = await requireUser();
  const { id } = await params;
  const { f = "diff" } = await searchParams;
  const other = await db.user.findUnique({ where: { id } });
  if (!other || other.role !== "STUDENT") notFound();
  // Сравниваем с собой (ученик) или, для взрослых, с выбранным учеником.
  const meId = u.role === "STUDENT" ? u.id : (await searchParams).with;
  const me = meId ? await db.user.findUnique({ where: { id: meId } }) : null;
  const [gms, a, b] = await Promise.all([
    db.grandmaster.findMany({ orderBy: { rank: "asc" } }),
    me ? db.collectionItem.findMany({ where: { userId: me.id, collectedAt: { not: null } } }) : Promise.resolve([]),
    db.collectionItem.findMany({ where: { userId: other.id, collectedAt: { not: null } } }),
  ]);
  const A = new Set(a.map((x) => x.gmId)), B = new Set(b.map((x) => x.gmId));
  const list = gms.filter((g) =>
    f === "onlyMe" ? A.has(g.id) && !B.has(g.id) :
    f === "onlyThem" ? B.has(g.id) && !A.has(g.id) :
    f === "both" ? A.has(g.id) && B.has(g.id) :
    f === "all" ? true : A.has(g.id) !== B.has(g.id));
  const byRarity = (s: Set<string>) => (Object.keys(RARITIES) as Rarity[]).map((r) => [r, gms.filter((g) => g.rarity === r && s.has(g.id)).length] as const);
  const meName = me ? (me.id === u.id ? "Вы" : me.name) : "—";
  return (
    <>
      <div className="page-head">
        <h1>Сравнение коллекций</h1>
        <Link href="/leaderboard" className="btn secondary sm">← К рейтингу</Link>
      </div>
      <div className="grid grid-2 mb">
        {[[meName, A] as const, [other.name, B] as const].map(([name, s]) => (
          <div className="card" key={name}>
            <h2>{name}</h2>
            <div className="rating-big">{s.size} <span className="small muted">из {gms.length}</span></div>
            <div className="row small" style={{ marginTop: 6 }}>
              {byRarity(s).map(([r, n]) => <span key={r} className="badge" style={{ color: RARITIES[r].color }}>{RARITIES[r].label}: {n}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="tabs">
        {[["diff", "Различия"], ["onlyMe", `Только у ${meName === "Вы" ? "вас" : meName}`], ["onlyThem", `Только у ${other.name}`], ["both", "У обоих"], ["all", "Все 200"]].map(([k, l]) => (
          <Link key={k} href={`?f=${k}${me && me.id !== u.id ? `&with=${me.id}` : ""}`} className={f === k ? "active" : ""}>{l}</Link>
        ))}
      </div>
      {list.length === 0 ? <div className="empty">Нет карточек</div> : (
        <div className="gm-grid">
          {list.map((g) => (
            <GmCard key={g.id} gm={g} collected={A.has(g.id) || B.has(g.id)} extra={
              <div className="row tiny" style={{ marginTop: 4, gap: 4 }}>
                <span className={`badge ${A.has(g.id) ? "ok" : ""}`}>{meName === "Вы" ? "Вы" : "1"} {A.has(g.id) ? "✓" : "✗"}</span>
                <span className={`badge ${B.has(g.id) ? "ok" : ""}`}>{other.name.split(" ")[0]} {B.has(g.id) ? "✓" : "✗"}</span>
              </div>
            } />
          ))}
        </div>
      )}
    </>
  );
}
