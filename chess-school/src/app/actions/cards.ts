"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { openPack, exchangeShards } from "@/lib/collection";

export async function openPackAction() {
  const u = await requireUser(["STUDENT"]);
  try {
    const r = await openPack(u.id);
    revalidatePath("/cards");
    return { ok: true as const, ...r };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function exchangeAction(fd: FormData) {
  const u = await requireUser(["STUDENT"]);
  await exchangeShards(u.id, String(fd.get("gmId")));
  revalidatePath("/cards");
}
