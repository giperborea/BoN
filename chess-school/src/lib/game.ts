// Игровая механика «Тренируй гроссмейстера»: рейтинг персонажа (Эло) и игровые уровни (опыт).

export function expectedScore(rating: number, puzzleRating: number) {
  return 1 / (1 + Math.pow(10, (puzzleRating - rating) / 400));
}

export function ratingDelta(rating: number, puzzleRating: number, success: boolean, attempts: number) {
  const k = attempts < 20 ? 40 : 24; // в начале рейтинг «разгоняется» быстрее
  const d = Math.round(k * ((success ? 1 : 0) - expectedScore(rating, puzzleRating)));
  if (success) return Math.max(d, 1);
  return Math.min(d, -1);
}

export function xpFor(puzzleRating: number, success: boolean) {
  if (!success) return 1;
  return 10 + Math.max(0, Math.round((puzzleRating - 1000) / 50));
}

export const MAX_LEVEL = 30;

/** Опыт, необходимый для достижения уровня L (уровень 1 = 0 XP). */
export function xpForLevel(level: number) {
  if (level <= 1) return 0;
  return Math.round(40 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
}

const TITLES: [number, string, string][] = [
  [1, "Пешка", "♟"],
  [3, "Конь", "♞"],
  [5, "Слон", "♝"],
  [7, "Ладья", "♜"],
  [9, "Ферзь", "♛"],
  [11, "Король", "♚"],
  [14, "Кандидат в мастера", "🎖"],
  [17, "Мастер", "🏅"],
  [20, "Международный мастер", "🥈"],
  [24, "Гроссмейстер", "🥇"],
  [28, "Легенда", "👑"],
];

export function levelInfo(xp: number) {
  const level = levelFromXp(xp);
  let title = TITLES[0];
  for (const t of TITLES) if (level >= t[0]) title = t;
  const cur = xpForLevel(level);
  const next = level >= MAX_LEVEL ? cur : xpForLevel(level + 1);
  return {
    level,
    title: title[1],
    icon: title[2],
    xp,
    xpInto: xp - cur,
    xpNeed: next - cur,
    progress: level >= MAX_LEVEL ? 1 : (xp - cur) / Math.max(1, next - cur),
  };
}

export const LEVEL_TITLES = TITLES;
