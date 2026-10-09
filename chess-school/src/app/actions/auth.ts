"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getUser, homeFor } from "@/lib/auth";
import { TEST_MODE } from "@/lib/config";

export async function login(_: unknown, fd: FormData) {
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const u = await db.user.findUnique({ where: { login } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return { error: "Неверный логин или пароль" };
  await createSession(u.id);
  redirect(homeFor(u.role));
}

export async function demoLogin(fd: FormData) {
  if (!TEST_MODE) throw new Error("Демо-вход доступен только в тестовом режиме");
  const u = await db.user.findUnique({ where: { login: String(fd.get("login")) } });
  if (!u) throw new Error("Нет такого пользователя");
  await createSession(u.id);
  redirect(homeFor(u.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function giveConsent(_: unknown, fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (fd.get("agree") !== "on") return { error: "Нужно отметить согласие" };
  const type = String(fd.get("type") ?? "SELF");
  const parentName = String(fd.get("parentName") ?? "").trim();
  if (type === "PARENT" && !parentName) return { error: "Укажите ФИО родителя / законного представителя" };
  await db.user.update({
    where: { id: u.id },
    data: { consentAt: new Date(), consentType: type, consentParentName: type === "PARENT" ? parentName : null },
  });
  redirect("/");
}

export async function linkLichessTest(_: unknown, fd: FormData) {
  if (!TEST_MODE) return { error: "Тестовое подключение отключено" };
  const u = await getUser();
  if (!u) redirect("/login");
  const name = String(fd.get("username") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(name)) return { error: "Ник Lichess: 2–30 символов, латиница, цифры, _ и -" };
  await db.user.update({ where: { id: u.id }, data: { lichessUsername: name, lichessLinkedAt: new Date(), lichessToken: null } });
  redirect("/");
}
