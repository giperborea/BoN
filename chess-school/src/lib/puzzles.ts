import { Chess } from "chess.js";
import { db } from "./db";
import { ratingDelta, xpFor, levelInfo } from "./game";
import { checkAchievements } from "./achievements";
import { START_RATING } from "./config";

export function parseMoves(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

function uciToObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

/** Проверка задачи при добавлении: FEN корректен, ходы легальны, нечётное количество ходов. */
export function validatePuzzle(fen: string, moves: string[]) {
  let chess: Chess;
  try { chess = new Chess(fen); } catch (e) { return `Некорректный FEN: ${(e as Error).message}`; }
  if (!moves.length) return "Нужен хотя бы один ход";
  if (moves.length % 2 === 0) return "Цепочка должна заканчиваться ходом ученика (нечётное число ходов)";
  for (const [i, m] of moves.entries()) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)) return `Ход ${i + 1} «${m}» не в формате UCI (например e2e4)`;
    try { chess.move(uciToObj(m)); } catch { return `Ход ${i + 1} «${m}» нелегален`; }
  }
  return null;
}

/** Позиция задачи после первых n ходов. */
function positionAt(fen: string, moves: string[], n: number) {
  const c = new Chess(fen);
  for (let i = 0; i < n; i++) c.move(uciToObj(moves[i]));
  return c;
}

export async function getActiveCharacter(userId: string) {
  return db.character.findFirst({ where: { userId, active: true }, include: { gm: true } });
}

/** Создание/смена персонажа. Смена — с потерей уровня: новый персонаж начинает с нуля. */
export async function chooseCharacter(userId: string, gmId: string) {
  const gm = await db.grandmaster.findUniqueOrThrow({ where: { id: gmId } });
  if (!gm.playable) throw new Error("Этот гроссмейстер недоступен в игре (только топ-50)");
  const item = await db.collectionItem.findUnique({ where: { userId_gmId: { userId, gmId } } });
  if (!item?.collectedAt) throw new Error("Сначала соберите карточку этого гроссмейстера");
  const current = await getActiveCharacter(userId);
  if (current?.gmId === gmId) return current;
  await db.$transaction(async (tx) => {
    await tx.puzzleAttempt.updateMany({ where: { userId, status: "PENDING" }, data: { status: "FAILED", finishedAt: new Date() } });
    if (current) await tx.character.update({ where: { id: current.id }, data: { active: false, endedAt: new Date() } });
    await tx.character.create({ data: { userId, gmId, rating: START_RATING, peak: START_RATING } });
  });
  return getActiveCharacter(userId);
}

async function finishAttempt(attemptId: string, success: boolean, at: Date = new Date()) {
  const a = await db.puzzleAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { puzzle: true, character: true } });
  const ch = a.character;
  const delta = ratingDelta(ch.rating, a.puzzle.rating, success, ch.solved + ch.failed);
  const xp = xpFor(a.puzzle.rating, success);
  const rating = Math.max(400, ch.rating + delta);
  const streak = success ? ch.streak + 1 : 0;
  const before = levelInfo(ch.xp).level;
  await db.$transaction([
    db.puzzleAttempt.update({ where: { id: a.id }, data: { status: success ? "SOLVED" : "FAILED", ratingAfter: rating, xpGained: xp, finishedAt: at } }),
    db.character.update({
      where: { id: ch.id },
      data: {
        rating, peak: Math.max(ch.peak, rating), xp: ch.xp + xp,
        solved: ch.solved + (success ? 1 : 0), failed: ch.failed + (success ? 0 : 1),
        streak, bestStreak: Math.max(ch.bestStreak, streak),
      },
    }),
  ]);
  const achievements = await checkAchievements(a.userId, at);
  const after = levelInfo(ch.xp + xp);
  return { ratingBefore: ch.rating, rating, delta: rating - ch.rating, xp, level: after, levelUp: after.level > before, achievements };
}

/**
 * Следующая задача. Незавершённая предыдущая засчитывается как ошибка.
 * Подбор: случайная задача в окне ±250 от рейтинга персонажа (расширяется, если пусто),
 * без последних 10 показанных. Решённые/нерешённые задачи могут выпасть снова.
 */
export async function nextPuzzle(userId: string) {
  const ch = await getActiveCharacter(userId);
  if (!ch) throw new Error("Сначала выберите гроссмейстера");
  const pending = await db.puzzleAttempt.findMany({ where: { userId, status: "PENDING" } });
  for (const p of pending) await finishAttempt(p.id, false);
  const fresh = (await getActiveCharacter(userId))!;
  const recent = await db.puzzleAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { puzzleId: true } });
  const exclude = recent.map((r) => r.puzzleId);
  let pool: { id: string }[] = [];
  for (const w of [250, 400, 700, 5000]) {
    pool = await db.puzzle.findMany({
      where: { active: true, rating: { gte: fresh.rating - w, lte: fresh.rating + w }, id: { notIn: exclude } },
      select: { id: true },
    });
    if (pool.length) break;
  }
  if (!pool.length) pool = await db.puzzle.findMany({ where: { active: true }, select: { id: true } });
  if (!pool.length) throw new Error("В базе нет задач");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const puzzle = await db.puzzle.findUniqueOrThrow({ where: { id: pick.id } });
  const attempt = await db.puzzleAttempt.create({ data: { userId, characterId: fresh.id, puzzleId: puzzle.id, ratingBefore: fresh.rating } });
  const turn = new Chess(puzzle.fen).turn();
  return {
    attemptId: attempt.id,
    fen: puzzle.fen,
    orientation: turn === "w" ? "white" as const : "black" as const,
    title: puzzle.title,
    hint: puzzle.hint,
    rating: puzzle.rating,
    theme: puzzle.theme,
    code: puzzle.code,
    character: { rating: fresh.rating },
    penalized: pending.length > 0,
  };
}

/**
 * Проверка хода ученика. Допускается только заранее заданная цепочка;
 * исключение — любой мат последним ходом тоже засчитывается.
 * Второй попытки нет: ошибка сразу завершает задачу.
 */
export async function submitMove(userId: string, attemptId: string, uci: string) {
  const a = await db.puzzleAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { puzzle: true } });
  if (a.userId !== userId) throw new Error("Чужая попытка");
  if (a.status !== "PENDING") throw new Error("Задача уже завершена");
  const moves = parseMoves(a.puzzle.moves);
  const pos = positionAt(a.puzzle.fen, moves, a.step);
  const expected = pos.move(uciToObj(moves[a.step]));
  pos.undo();
  let played;
  try { played = pos.move(uciToObj(uci)); } catch { played = null; }
  const isLast = a.step === moves.length - 1;
  const correct = !!played && (played.san === expected.san || (isLast && pos.isCheckmate()));
  if (!correct) {
    const res = await finishAttempt(a.id, false);
    return { result: "wrong" as const, solution: moves.slice(a.step), ...res };
  }
  if (isLast) {
    const res = await finishAttempt(a.id, true);
    return { result: "solved" as const, ...res };
  }
  const reply = moves[a.step + 1];
  await db.puzzleAttempt.update({ where: { id: a.id }, data: { step: a.step + 2 } });
  return { result: "correct" as const, reply };
}

/** Отказ от задачи (кнопка «Сдаться»): засчитывается ошибка, показывается решение. */
export async function giveUp(userId: string, attemptId: string) {
  const a = await db.puzzleAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { puzzle: true } });
  if (a.userId !== userId || a.status !== "PENDING") throw new Error("Задача уже завершена");
  const moves = parseMoves(a.puzzle.moves);
  const res = await finishAttempt(a.id, false);
  return { result: "wrong" as const, solution: moves.slice(a.step), ...res };
}

export { finishAttempt };
