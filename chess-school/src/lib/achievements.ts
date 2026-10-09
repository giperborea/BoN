import { db } from "./db";

// Метрики, по которым выдаются достижения.
export type Metric =
  | "solved" | "bestStreak" | "peakRating" | "level" | "hardSolved" | "mateSolved"
  | "lessons" | "grade5" | "cards" | "legendaryCards" | "wcCards" | "packsOpened";

export type AchievementDef = {
  code: string; title: string; description: string; icon: string;
  category: "TACTICS" | "GAME" | "COLLECTION" | "LESSONS" | "HOMEWORK";
  packs: number; metric: Metric; threshold: number;
};

// Паки выдаются только за достижения в решении тактики (по ТЗ).
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_puzzle", title: "Первый шаг", description: "Решить первую задачу", icon: "🎯", category: "TACTICS", packs: 1, metric: "solved", threshold: 1 },
  { code: "puzzles_10", title: "Разминка", description: "Решить 10 задач", icon: "🔟", category: "TACTICS", packs: 2, metric: "solved", threshold: 10 },
  { code: "puzzles_50", title: "Тактик", description: "Решить 50 задач", icon: "⚔️", category: "TACTICS", packs: 3, metric: "solved", threshold: 50 },
  { code: "puzzles_100", title: "Сотня", description: "Решить 100 задач", icon: "💯", category: "TACTICS", packs: 5, metric: "solved", threshold: 100 },
  { code: "puzzles_250", title: "Машина тактики", description: "Решить 250 задач", icon: "🤖", category: "TACTICS", packs: 7, metric: "solved", threshold: 250 },
  { code: "streak_5", title: "Без ошибок", description: "5 задач подряд без ошибок", icon: "🔥", category: "TACTICS", packs: 2, metric: "bestStreak", threshold: 5 },
  { code: "streak_10", title: "В огне", description: "10 задач подряд без ошибок", icon: "☄️", category: "TACTICS", packs: 4, metric: "bestStreak", threshold: 10 },
  { code: "mate_10", title: "Матовый мастер", description: "Решить 10 задач на мат", icon: "♚", category: "TACTICS", packs: 2, metric: "mateSolved", threshold: 10 },
  { code: "hard_1", title: "Крепкий орешек", description: "Решить задачу рейтингом 1800+", icon: "🥜", category: "TACTICS", packs: 3, metric: "hardSolved", threshold: 1 },
  { code: "rating_1200", title: "Рейтинг 1200", description: "Персонаж достиг рейтинга 1200", icon: "📈", category: "TACTICS", packs: 2, metric: "peakRating", threshold: 1200 },
  { code: "rating_1400", title: "Рейтинг 1400", description: "Персонаж достиг рейтинга 1400", icon: "📈", category: "TACTICS", packs: 3, metric: "peakRating", threshold: 1400 },
  { code: "rating_1600", title: "Рейтинг 1600", description: "Персонаж достиг рейтинга 1600", icon: "🚀", category: "TACTICS", packs: 4, metric: "peakRating", threshold: 1600 },
  { code: "rating_1800", title: "Рейтинг 1800", description: "Персонаж достиг рейтинга 1800", icon: "🚀", category: "TACTICS", packs: 5, metric: "peakRating", threshold: 1800 },
  { code: "rating_2000", title: "Рейтинг 2000", description: "Персонаж достиг рейтинга 2000", icon: "🏆", category: "TACTICS", packs: 7, metric: "peakRating", threshold: 2000 },
  { code: "level_5", title: "Уровень 5", description: "Прокачать персонажа до 5 уровня", icon: "⭐", category: "GAME", packs: 0, metric: "level", threshold: 5 },
  { code: "level_10", title: "Уровень 10", description: "Прокачать персонажа до 10 уровня", icon: "🌟", category: "GAME", packs: 0, metric: "level", threshold: 10 },
  { code: "level_20", title: "Уровень 20", description: "Прокачать персонажа до 20 уровня", icon: "💫", category: "GAME", packs: 0, metric: "level", threshold: 20 },
  { code: "lesson_1", title: "Первое занятие", description: "Пройти первое занятие", icon: "📘", category: "LESSONS", packs: 0, metric: "lessons", threshold: 1 },
  { code: "lessons_10", title: "10 занятий", description: "Пройти 10 занятий", icon: "📚", category: "LESSONS", packs: 0, metric: "lessons", threshold: 10 },
  { code: "lessons_25", title: "25 занятий", description: "Пройти 25 занятий", icon: "🎓", category: "LESSONS", packs: 0, metric: "lessons", threshold: 25 },
  { code: "grade5_1", title: "Отличник", description: "Получить 5 за домашку", icon: "🅰️", category: "HOMEWORK", packs: 0, metric: "grade5", threshold: 1 },
  { code: "grade5_5", title: "Круглый отличник", description: "Получить 5 пятёрок за домашки", icon: "🏵", category: "HOMEWORK", packs: 0, metric: "grade5", threshold: 5 },
  { code: "card_1", title: "Коллекционер", description: "Собрать первую карточку", icon: "🃏", category: "COLLECTION", packs: 0, metric: "cards", threshold: 1 },
  { code: "cards_10", title: "Альбом", description: "Собрать 10 карточек", icon: "📒", category: "COLLECTION", packs: 0, metric: "cards", threshold: 10 },
  { code: "cards_50", title: "Музей шахмат", description: "Собрать 50 карточек", icon: "🏛", category: "COLLECTION", packs: 0, metric: "cards", threshold: 50 },
  { code: "legendary_1", title: "Легенда в руках", description: "Собрать легендарную карточку", icon: "👑", category: "COLLECTION", packs: 0, metric: "legendaryCards", threshold: 1 },
  { code: "wc_1", title: "Чемпион мира", description: "Собрать карточку чемпиона мира", icon: "🏆", category: "COLLECTION", packs: 0, metric: "wcCards", threshold: 1 },
  { code: "packs_25", title: "Распаковщик", description: "Открыть 25 паков", icon: "📦", category: "COLLECTION", packs: 0, metric: "packsOpened", threshold: 25 },
];

export const CATEGORY_LABEL: Record<string, string> = {
  TACTICS: "Тактика", GAME: "Игра", COLLECTION: "Коллекция", LESSONS: "Занятия", HOMEWORK: "Домашка",
};

async function metrics(userId: string): Promise<Record<Metric, number>> {
  const { levelFromXp } = await import("./game");
  const [chars, hard, mate, lessons, grade5, cards, packsOpened] = await Promise.all([
    db.character.findMany({ where: { userId } }),
    db.puzzleAttempt.count({ where: { userId, status: "SOLVED", puzzle: { rating: { gte: 1800 } } } }),
    db.puzzleAttempt.count({ where: { userId, status: "SOLVED", puzzle: { theme: { startsWith: "mate" } } } }),
    db.lesson.count({ where: { studentId: userId, status: { in: ["STARTED", "DONE"] } } }),
    db.study.count({ where: { studentId: userId, grade: 5 } }),
    db.collectionItem.findMany({ where: { userId, collectedAt: { not: null } }, include: { gm: true } }),
    db.packOpening.count({ where: { userId } }),
  ]);
  return {
    solved: chars.reduce((s, c) => s + c.solved, 0),
    bestStreak: Math.max(0, ...chars.map((c) => c.bestStreak)),
    peakRating: Math.max(0, ...chars.map((c) => c.peak)),
    level: Math.max(0, ...chars.map((c) => levelFromXp(c.xp))),
    hardSolved: hard,
    mateSolved: mate,
    lessons,
    grade5,
    cards: cards.length,
    legendaryCards: cards.filter((c) => c.gm.rarity === "LEGENDARY").length,
    wcCards: cards.filter((c) => c.gm.worldChampion).length,
    packsOpened,
  };
}

/** Проверяет и выдаёт новые достижения. Возвращает список полученных. */
export async function checkAchievements(userId: string, at: Date = new Date()) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "STUDENT") return [];
  const m = await metrics(userId);
  const all = await db.achievement.findMany({ include: { users: { where: { userId } } } });
  const earned: { code: string; title: string; icon: string; packs: number }[] = [];
  for (const a of all) {
    if (a.users.length) continue;
    const def = ACHIEVEMENTS.find((d) => d.code === a.code);
    if (!def || m[def.metric] < def.threshold) continue;
    await db.userAchievement.create({ data: { userId, achievementId: a.id, earnedAt: at } });
    if (a.packs > 0) await db.user.update({ where: { id: userId }, data: { packs: { increment: a.packs } } });
    earned.push({ code: a.code, title: a.title, icon: a.icon, packs: a.packs });
  }
  return earned;
}

export async function syncAchievementDefs() {
  for (const [i, d] of ACHIEVEMENTS.entries()) {
    const data = { title: d.title, description: d.description, icon: d.icon, category: d.category, packs: d.packs, sort: i };
    await db.achievement.upsert({ where: { code: d.code }, update: data, create: { code: d.code, ...data } });
  }
}
