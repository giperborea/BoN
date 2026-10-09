"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { nextPuzzle, submitMove, giveUp, chooseCharacter } from "@/lib/puzzles";
import { takeStarter } from "@/lib/collection";

function err(e: unknown) { return { error: (e as Error).message }; }

export async function nextPuzzleAction() {
  const u = await requireUser(["STUDENT"]);
  try { return { ok: true as const, puzzle: await nextPuzzle(u.id) }; } catch (e) { return err(e); }
}

export async function submitMoveAction(attemptId: string, uci: string) {
  const u = await requireUser(["STUDENT"]);
  try { return { ok: true as const, res: await submitMove(u.id, attemptId, uci) }; } catch (e) { return err(e); }
}

export async function giveUpAction(attemptId: string) {
  const u = await requireUser(["STUDENT"]);
  try { return { ok: true as const, res: await giveUp(u.id, attemptId) }; } catch (e) { return err(e); }
}

export async function chooseCharacterAction(fd: FormData) {
  const u = await requireUser(["STUDENT"]);
  await chooseCharacter(u.id, String(fd.get("gmId")));
  revalidatePath("/game");
}

export async function takeStarterAction(fd: FormData) {
  const u = await requireUser(["STUDENT"]);
  const gmId = String(fd.get("gmId"));
  await takeStarter(u.id, gmId);
  await chooseCharacter(u.id, gmId);
  revalidatePath("/game");
}
