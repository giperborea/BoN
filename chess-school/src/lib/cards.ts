// Механика коллекции карточек.
// 200 гроссмейстеров, 4 редкости. Карточка собирается из частей.
// Пак = 5 частей. Лишние части (у уже собранной карточки) превращаются в «осколки»,
// за осколки можно обменять часть любой нужной карточки.

export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const RARITIES: Record<Rarity, {
  label: string; fragments: number; dropChance: number; shardValue: number; exchangeCost: number; color: string;
}> = {
  LEGENDARY: { label: "Легендарная", fragments: 12, dropChance: 0.04, shardValue: 8, exchangeCost: 48, color: "#f5a623" },
  EPIC:      { label: "Эпическая",   fragments: 8,  dropChance: 0.13, shardValue: 4, exchangeCost: 24, color: "#a855f7" },
  RARE:      { label: "Редкая",      fragments: 5,  dropChance: 0.28, shardValue: 2, exchangeCost: 12, color: "#3b82f6" },
  COMMON:    { label: "Обычная",     fragments: 3,  dropChance: 0.55, shardValue: 1, exchangeCost: 6,  color: "#64748b" },
};

export const PACK_SIZE = 5;

/** Редкость по месту в рейтинге величия (1..200). */
export function rarityForRank(rank: number): Rarity {
  if (rank <= 20) return "LEGENDARY";
  if (rank <= 60) return "EPIC";
  if (rank <= 120) return "RARE";
  return "COMMON";
}

/** В игре доступны топ-50. */
export const PLAYABLE_TOP = 50;

/** Стартовый гроссмейстер выбирается бесплатно из этих мест (топ-50, «эпические»). */
export const STARTER_RANKS = { from: 31, to: 50 };

export function rollRarity(rnd: () => number = Math.random): Rarity {
  const r = rnd();
  let acc = 0;
  for (const k of ["LEGENDARY", "EPIC", "RARE", "COMMON"] as Rarity[]) {
    acc += RARITIES[k].dropChance;
    if (r < acc) return k;
  }
  return "COMMON";
}
