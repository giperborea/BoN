import { GmAvatar } from "./GmAvatar";
import { RARITIES, Rarity } from "@/lib/cards";

export type GmCardData = {
  id: string; slug: string; name: string; rank: number; rarity: string; worldChampion: boolean;
  fragmentsNeeded: number; imageUrl?: string | null; country?: string; peakRating?: number | null;
};

const FLAG = (cc?: string) =>
  !cc || cc.length !== 2 || cc === "SU" ? (cc === "SU" ? "☭" : "") :
    String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export function GmCard({ gm, fragments, collected, extra, selected }: {
  gm: GmCardData; fragments?: number; collected?: boolean; extra?: React.ReactNode; selected?: boolean;
}) {
  const r = RARITIES[gm.rarity as Rarity];
  const locked = collected === false;
  return (
    <div className={`gm-card ${locked ? "locked" : ""} ${selected ? "selected" : ""}`} style={{ ["--rc" as string]: r.color }}>
      <span className="rk">#{gm.rank}</span>
      {gm.worldChampion && <span className="wc" title="Чемпион мира">🏆</span>}
      <GmAvatar gm={gm} className="art" />
      <div className="meta">
        <div className="nm">{gm.name} {FLAG(gm.country)}</div>
        <div className="tiny" style={{ color: r.color, fontWeight: 700 }}>{r.label}</div>
        {fragments !== undefined && !collected && (
          <>
            <div className="frag">Части: {fragments}/{gm.fragmentsNeeded}</div>
            <div className="progress" style={{ marginTop: 3 }}><div style={{ width: `${(fragments / gm.fragmentsNeeded) * 100}%` }} /></div>
          </>
        )}
        {extra}
      </div>
    </div>
  );
}
