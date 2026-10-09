import { db } from "./db";
import { PACK_SIZE, RARITIES, Rarity, rollRarity, STARTER_RANKS } from "./cards";
import { checkAchievements } from "./achievements";

export type PackFragment = {
  gmId: string; slug: string; name: string; rarity: Rarity; rank: number;
  duplicate: boolean; shards: number; completed: boolean; fragments: number; needed: number;
};

async function grantFragment(userId: string, gm: { id: string; fragmentsNeeded: number; rarity: string }, at: Date) {
  const item = await db.collectionItem.upsert({
    where: { userId_gmId: { userId, gmId: gm.id } },
    update: {},
    create: { userId, gmId: gm.id, fragments: 0 },
  });
  if (item.collectedAt) {
    const shards = RARITIES[gm.rarity as Rarity].shardValue;
    await db.user.update({ where: { id: userId }, data: { shards: { increment: shards } } });
    return { duplicate: true, shards, completed: false, fragments: item.fragments };
  }
  const fragments = item.fragments + 1;
  const completed = fragments >= gm.fragmentsNeeded;
  await db.collectionItem.update({ where: { id: item.id }, data: { fragments, collectedAt: completed ? at : null } });
  return { duplicate: false, shards: 0, completed, fragments };
}

export async function openPack(userId: string, rnd: () => number = Math.random, at: Date = new Date()) {
  const dec = await db.user.updateMany({ where: { id: userId, packs: { gt: 0 } }, data: { packs: { decrement: 1 } } });
  if (dec.count === 0) throw new Error("Нет доступных паков");
  const gms = await db.grandmaster.findMany({ select: { id: true, slug: true, name: true, rarity: true, rank: true, fragmentsNeeded: true } });
  const byRarity = new Map<string, typeof gms>();
  for (const g of gms) byRarity.set(g.rarity, [...(byRarity.get(g.rarity) ?? []), g]);
  const result: PackFragment[] = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const rarity = rollRarity(rnd);
    const pool = byRarity.get(rarity)!;
    const gm = pool[Math.floor(rnd() * pool.length)];
    const r = await grantFragment(userId, gm, at);
    result.push({ gmId: gm.id, slug: gm.slug, name: gm.name, rarity: gm.rarity as Rarity, rank: gm.rank, needed: gm.fragmentsNeeded, ...r });
  }
  await db.packOpening.create({ data: { userId, result: JSON.stringify(result), openedAt: at } });
  const achievements = await checkAchievements(userId, at);
  return { fragments: result, achievements };
}

/** Обмен осколков (от повторных частей) на часть нужной карточки. */
export async function exchangeShards(userId: string, gmId: string) {
  const gm = await db.grandmaster.findUniqueOrThrow({ where: { id: gmId } });
  const item = await db.collectionItem.findUnique({ where: { userId_gmId: { userId, gmId } } });
  if (item?.collectedAt) throw new Error("Эта карточка уже собрана");
  const cost = RARITIES[gm.rarity as Rarity].exchangeCost;
  const dec = await db.user.updateMany({ where: { id: userId, shards: { gte: cost } }, data: { shards: { decrement: cost } } });
  if (dec.count === 0) throw new Error(`Нужно ${cost} осколков`);
  const r = await grantFragment(userId, gm, new Date());
  const achievements = await checkAchievements(userId);
  return { ...r, achievements };
}

/** Стартовая карточка: бесплатно, один раз, из топ-50 (места 31–50). */
export async function takeStarter(userId: string, gmId: string) {
  const gm = await db.grandmaster.findUniqueOrThrow({ where: { id: gmId } });
  if (gm.rank < STARTER_RANKS.from || gm.rank > STARTER_RANKS.to) throw new Error("Этот гроссмейстер недоступен как стартовый");
  const dec = await db.user.updateMany({ where: { id: userId, starterTaken: false }, data: { starterTaken: true } });
  if (dec.count === 0) throw new Error("Стартовая карточка уже получена");
  await db.collectionItem.upsert({
    where: { userId_gmId: { userId, gmId } },
    update: { fragments: gm.fragmentsNeeded, collectedAt: new Date() },
    create: { userId, gmId, fragments: gm.fragmentsNeeded, collectedAt: new Date() },
  });
  await checkAchievements(userId);
}
