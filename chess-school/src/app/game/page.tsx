import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveCharacter } from "@/lib/puzzles";
import { levelInfo } from "@/lib/game";
import { STARTER_RANKS, RARITIES, Rarity } from "@/lib/cards";
import { PuzzleGame } from "@/components/PuzzleGame";
import { GmCard } from "@/components/GmCard";
import { GmAvatar } from "@/components/GmAvatar";
import { chooseCharacterAction, takeStarterAction } from "@/app/actions/game";
import Link from "next/link";

export default async function GamePage() {
  const u = await requireUser(["STUDENT"]);
  const ch = await getActiveCharacter(u.id);
  const owned = await db.collectionItem.findMany({
    where: { userId: u.id, collectedAt: { not: null }, gm: { playable: true } },
    include: { gm: true }, orderBy: { gm: { rank: "asc" } },
  });

  if (!ch) {
    const starters = !u.starterTaken ? await db.grandmaster.findMany({
      where: { rank: { gte: STARTER_RANKS.from, lte: STARTER_RANKS.to } }, orderBy: { rank: "asc" },
    }) : [];
    return (
      <>
        <div className="page-head"><h1>♞ Тренируй гроссмейстера</h1></div>
        <div className="card mb">
          <p style={{ marginTop: 0 }}>Выберите гроссмейстера из топ-50 и прокачивайте его, решая задачи. Чтобы взять гроссмейстера в игру, нужно собрать его карточку в <Link href="/cards">коллекции</Link>.</p>
          {!u.starterTaken && <p className="muted small" style={{ marginBottom: 0 }}>Для старта один гроссмейстер — в подарок. Выберите любого:</p>}
        </div>
        {owned.length > 0 && (
          <>
            <h2>Ваши гроссмейстеры</h2>
            <div className="gm-grid mb">
              {owned.map((o) => (
                <form key={o.id} action={chooseCharacterAction}>
                  <input type="hidden" name="gmId" value={o.gmId} />
                  <GmCard gm={o.gm} collected extra={<button className="btn sm block" style={{ marginTop: 6 }}>Играть</button>} />
                </form>
              ))}
            </div>
          </>
        )}
        {starters.length > 0 && (
          <>
            <h2>Стартовый гроссмейстер (бесплатно)</h2>
            <div className="gm-grid">
              {starters.map((g) => (
                <form key={g.id} action={takeStarterAction}>
                  <input type="hidden" name="gmId" value={g.id} />
                  <GmCard gm={g} extra={<button className="btn sm block" style={{ marginTop: 6 }}>Выбрать</button>} />
                </form>
              ))}
            </div>
          </>
        )}
        {owned.length === 0 && starters.length === 0 && (
          <div className="empty">Соберите карточку любого гроссмейстера из топ-50, чтобы начать. <Link href="/cards">Открыть паки →</Link></div>
        )}
      </>
    );
  }

  const lv = levelInfo(ch.xp);
  const others = owned.filter((o) => o.gmId !== ch.gmId);
  return (
    <>
      <div className="page-head">
        <div className="hero">
          <div className="ava" style={{ ["--rc" as string]: RARITIES[ch.gm.rarity as Rarity].color }}><GmAvatar gm={ch.gm} /></div>
          <div>
            <div className="small muted">Ваш гроссмейстер</div>
            <h1 style={{ margin: 0 }}>{ch.gm.name}</h1>
            <div className="small muted">Решено {ch.solved} · ошибок {ch.failed} · пик рейтинга {ch.peak} · лучшая серия {ch.bestStreak}</div>
          </div>
        </div>
        <details className="inline">
          <summary className="btn secondary sm">Сменить гроссмейстера</summary>
          <div className="pop card" style={{ maxWidth: 560 }}>
            <div className="alert error small">Внимание: при смене персонажа уровень и рейтинг теряются — новый гроссмейстер начинает с нуля (рейтинг 1000, уровень 1).</div>
            {others.length === 0 ? <div className="muted small">Нет других собранных гроссмейстеров из топ-50. <Link href="/cards">В коллекцию →</Link></div> : (
              <div className="gm-grid">
                {others.map((o) => (
                  <form key={o.id} action={chooseCharacterAction}>
                    <input type="hidden" name="gmId" value={o.gmId} />
                    <GmCard gm={o.gm} collected extra={<button className="btn sm danger block" style={{ marginTop: 6 }}>Сменить</button>} />
                  </form>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
      <PuzzleGame key={ch.id} initialRating={ch.rating} initialLevel={lv} characterName={ch.gm.name} />
    </>
  );
}
