import { db } from "./db";
import { levelFromXp } from "./game";

/** Общий рейтинг: по самому рейтинговому персонажу ученика (пик рейтинга среди всех его персонажей). */
export async function leaderboard() {
  const [students, chars, cards] = await Promise.all([
    db.user.findMany({ where: { role: "STUDENT" }, select: { id: true, name: true, lichessUsername: true, coach: { select: { name: true } } } }),
    db.character.findMany({ include: { gm: { select: { name: true, slug: true, rarity: true, worldChampion: true } } } }),
    db.collectionItem.groupBy({ by: ["userId"], where: { collectedAt: { not: null } }, _count: true }),
  ]);
  const cardCount = new Map(cards.map((c) => [c.userId, c._count]));
  const rows = students.map((s) => {
    const mine = chars.filter((c) => c.userId === s.id);
    const best = mine.sort((a, b) => b.peak - a.peak)[0];
    const active = mine.find((c) => c.active);
    return {
      id: s.id, name: s.name, lichess: s.lichessUsername, coach: s.coach?.name,
      best: best ? { rating: best.peak, gm: best.gm, level: levelFromXp(best.xp), active: best.active } : null,
      current: active ? { rating: active.rating, gm: active.gm } : null,
      solved: mine.reduce((x, c) => x + c.solved, 0),
      cards: cardCount.get(s.id) ?? 0,
    };
  });
  rows.sort((a, b) => (b.best?.rating ?? 0) - (a.best?.rating ?? 0) || b.cards - a.cards);
  return rows;
}
