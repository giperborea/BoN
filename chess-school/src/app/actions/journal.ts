"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, SessionUser } from "@/lib/auth";
import { addPayment, startLesson, finishLesson, rescheduleLesson, changeBalance } from "@/lib/journal";
import { fromLocalInput } from "@/lib/format";
import { LATE_RESCHEDULE_HOURS } from "@/lib/config";
import { parseStudyId, studyUrl } from "@/lib/lichess";
import { checkAchievements } from "@/lib/achievements";
import { validatePuzzle } from "@/lib/puzzles";

type R = { error?: string; ok?: string } | null | undefined;
const fail = (e: unknown): R => ({ error: (e as Error).message });

async function assertLessonAccess(u: SessionUser, lessonId: string) {
  const l = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  if (u.role !== "ADMIN" && l.coachId !== u.id) throw new Error("Это урок другого тренера");
  return l;
}
async function assertStudentAccess(u: SessionUser, studentId: string) {
  const s = await db.user.findUniqueOrThrow({ where: { id: studentId } });
  if (s.role !== "STUDENT") throw new Error("Это не ученик");
  if (u.role !== "ADMIN" && s.coachId !== u.id) throw new Error("Это ученик другого тренера");
  return s;
}
function refresh() {
  for (const p of ["/admin", "/coach", "/admin/schedule", "/admin/reschedules", "/coach/homework", "/admin/payments"]) revalidatePath(p);
  revalidatePath("/students/[id]", "page");
  revalidatePath("/coach/lessons/[id]", "page");
}

// ---------- уроки ----------
export async function scheduleLessonAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN", "COACH"]);
  try {
    const studentId = String(fd.get("studentId"));
    const s = await assertStudentAccess(u, studentId);
    const when = String(fd.get("scheduledAt") ?? "");
    if (!when) throw new Error("Укажите дату и время");
    const coachId = u.role === "ADMIN" ? String(fd.get("coachId") || s.coachId || u.id) : u.id;
    const count = Math.min(12, Math.max(1, Number(fd.get("repeat") || 1)));
    const first = fromLocalInput(when);
    for (let i = 0; i < count; i++) {
      await db.lesson.create({
        data: {
          studentId, coachId, durationMin: Number(fd.get("durationMin") || 60), topic: String(fd.get("topic") || "") || null,
          scheduledAt: new Date(first.getTime() + i * 7 * 86_400_000),
        },
      });
    }
    refresh();
    return { ok: count > 1 ? `Запланировано ${count} занятий (еженедельно)` : "Занятие запланировано" };
  } catch (e) { return fail(e); }
}

export async function startLessonAction(fd: FormData) {
  const u = await requireUser(["ADMIN", "COACH"]);
  const id = String(fd.get("lessonId"));
  await assertLessonAccess(u, id);
  await startLesson(id, u.id);
  refresh();
  if (fd.get("open")) redirect(`/coach/lessons/${id}`);
}

export async function finishLessonAction(fd: FormData) {
  const u = await requireUser(["ADMIN", "COACH"]);
  const id = String(fd.get("lessonId"));
  await assertLessonAccess(u, id);
  await finishLesson(id);
  refresh();
}

export async function rescheduleAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN", "COACH"]);
  let msg = "", charged = false;
  try {
    const id = String(fd.get("lessonId"));
    await assertLessonAccess(u, id);
    const kind = fd.get("kind") === "CANCEL" ? "CANCEL" : "RESCHEDULE";
    const to = String(fd.get("toTime") ?? "");
    const r = await rescheduleLesson({
      lessonId: id, kind, toTime: kind === "RESCHEDULE" && to ? fromLocalInput(to) : undefined,
      reason: String(fd.get("reason") || "") || undefined, byUserId: u.id,
    });
    refresh();
    const what = kind === "CANCEL" ? "Занятие отменено" : "Занятие перенесено";
    msg = r.charged ? `${what}. Менее ${LATE_RESCHEDULE_HOURS} ч до начала — занятие СПИСАНО с баланса.` : `${what} без списания.`;
    charged = r.charged;
  } catch (e) { return fail(e); }
  // строка урока после переноса перемещается, поэтому результат показываем общим сообщением
  await flashRedirect(msg, charged ? "warn" : "ok");
  return null;
}

async function flashRedirect(msg: string, kind = "ok"): Promise<never> {
  const ref = (await headers()).get("referer");
  let target = "/";
  try { if (ref) { const u = new URL(ref); u.searchParams.set("flash", msg); u.searchParams.set("fk", kind); target = u.pathname + u.search; } } catch {}
  redirect(target);
}

// ---------- студии и домашка ----------
export async function attachStudyAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN", "COACH"]);
  try {
    const lessonId = String(fd.get("lessonId"));
    const l = await assertLessonAccess(u, lessonId);
    const raw = String(fd.get("study") ?? "");
    const [maybeId, ...nameParts] = raw.split("|");
    const id = parseStudyId(maybeId);
    if (!id) throw new Error("Выберите студию или вставьте ссылку вида https://lichess.org/study/XXXXXXXX");
    const name = String(fd.get("name") || "").trim() || nameParts.join("|") || `Студия ${id}`;
    const category = String(fd.get("category"));
    if (!["LESSON", "HOMEWORK", "TODO"].includes(category)) throw new Error("Выберите группу");
    await db.study.create({ data: { lichessStudyId: id, name, url: studyUrl(id), category, studentId: l.studentId, coachId: l.coachId, lessonId } });
    refresh();
    return { ok: `Студия «${name}» добавлена` };
  } catch (e) { return fail(e); }
}

export async function removeStudyAction(fd: FormData) {
  const u = await requireUser(["ADMIN", "COACH"]);
  const s = await db.study.findUniqueOrThrow({ where: { id: String(fd.get("studyId")) } });
  if (u.role !== "ADMIN" && s.coachId !== u.id) throw new Error("Нет доступа");
  await db.study.delete({ where: { id: s.id } });
  refresh();
}

export async function gradeAction(fd: FormData) {
  const u = await requireUser(["ADMIN", "COACH"]);
  const s = await db.study.findUniqueOrThrow({ where: { id: String(fd.get("studyId")) } });
  if (u.role !== "ADMIN" && s.coachId !== u.id) throw new Error("Нет доступа");
  const grade = Number(fd.get("grade"));
  if (!(grade >= 1 && grade <= 5)) throw new Error("Оценка 1–5");
  await db.study.update({ where: { id: s.id }, data: { grade, gradeComment: String(fd.get("comment") || "") || s.gradeComment, gradedAt: new Date() } });
  await checkAchievements(s.studentId);
  refresh();
}

export async function todoDoneAction(fd: FormData) {
  const u = await requireUser(["ADMIN", "COACH"]);
  const s = await db.study.findUniqueOrThrow({ where: { id: String(fd.get("studyId")) } });
  if (u.role !== "ADMIN" && s.coachId !== u.id) throw new Error("Нет доступа");
  await db.study.update({ where: { id: s.id }, data: { doneAt: s.doneAt ? null : new Date() } });
  refresh();
}

// ---------- админ: оплаты, баланс, люди, задачи ----------
export async function addPaymentAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN"]);
  try {
    const lessons = Number(fd.get("lessons"));
    const amountRub = Number(fd.get("amountRub"));
    if (!Number.isInteger(lessons) || lessons <= 0) throw new Error("Укажите количество занятий");
    if (!(amountRub >= 0)) throw new Error("Укажите сумму");
    await addPayment({ studentId: String(fd.get("studentId")), lessons, amountRub, comment: String(fd.get("comment") || "") || undefined, createdById: u.id });
    refresh();
    return { ok: `Оплата внесена: +${lessons} занятий, +${lessons} паков карточек` };
  } catch (e) { return fail(e); }
}

export async function adjustBalanceAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN"]);
  try {
    const delta = Number(fd.get("delta"));
    const comment = String(fd.get("comment") || "").trim();
    if (!Number.isInteger(delta) || delta === 0) throw new Error("Укажите изменение (например −1 или 2)");
    if (!comment) throw new Error("Укажите причину корректировки");
    await db.$transaction((tx) => changeBalance(tx, { studentId: String(fd.get("studentId")), delta, reason: "MANUAL", comment, createdById: u.id }));
    refresh();
    return { ok: "Баланс скорректирован" };
  } catch (e) { return fail(e); }
}

function genPassword() {
  return Math.random().toString(36).slice(2, 8);
}

export async function createStudentAction(_: R, fd: FormData): Promise<R> {
  await requireUser(["ADMIN"]);
  try {
    const name = String(fd.get("name") || "").trim();
    const login = String(fd.get("login") || "").trim().toLowerCase();
    if (!name || !/^[a-z0-9_.-]{3,30}$/.test(login)) throw new Error("Имя и логин (латиница, 3–30 символов) обязательны");
    if (await db.user.findUnique({ where: { login } })) throw new Error("Логин занят");
    const password = String(fd.get("password") || "") || genPassword();
    let parentId: string | null = String(fd.get("parentId") || "") || null;
    let parentMsg = "";
    const parentName = String(fd.get("parentName") || "").trim();
    if (!parentId && parentName) {
      const pl = String(fd.get("parentLogin") || "").trim().toLowerCase() || `${login}-parent`;
      if (await db.user.findUnique({ where: { login: pl } })) throw new Error("Логин родителя занят");
      const pp = genPassword();
      const p = await db.user.create({ data: { login: pl, name: parentName, role: "PARENT", passwordHash: await bcrypt.hash(pp, 10), phone: String(fd.get("parentPhone") || "") || null } });
      parentId = p.id;
      parentMsg = ` Родитель: ${pl} / ${pp}.`;
    }
    await db.user.create({
      data: {
        login, name, role: "STUDENT", passwordHash: await bcrypt.hash(password, 10),
        coachId: String(fd.get("coachId") || "") || null, parentId, notes: String(fd.get("notes") || "") || null,
      },
    });
    refresh();
    return { ok: `Ученик создан: ${login} / ${password}.${parentMsg} Сохраните пароли — они показываются один раз.` };
  } catch (e) { return fail(e); }
}

export async function createStaffAction(_: R, fd: FormData): Promise<R> {
  await requireUser(["ADMIN"]);
  try {
    const role = String(fd.get("role"));
    if (!["COACH", "PARENT", "ADMIN"].includes(role)) throw new Error("Неверная роль");
    const name = String(fd.get("name") || "").trim();
    const login = String(fd.get("login") || "").trim().toLowerCase();
    if (!name || !/^[a-z0-9_.-]{3,30}$/.test(login)) throw new Error("Имя и логин (латиница, 3–30 символов) обязательны");
    if (await db.user.findUnique({ where: { login } })) throw new Error("Логин занят");
    const password = String(fd.get("password") || "") || genPassword();
    await db.user.create({ data: { login, name, role, passwordHash: await bcrypt.hash(password, 10), phone: String(fd.get("phone") || "") || null } });
    revalidatePath("/admin/staff");
    return { ok: `Создан: ${login} / ${password}` };
  } catch (e) { return fail(e); }
}

export async function updateStudentAction(_: R, fd: FormData): Promise<R> {
  await requireUser(["ADMIN"]);
  try {
    await db.user.update({
      where: { id: String(fd.get("studentId")) },
      data: { coachId: String(fd.get("coachId") || "") || null, parentId: String(fd.get("parentId") || "") || null, notes: String(fd.get("notes") || "") || null },
    });
    refresh();
    return { ok: "Сохранено" };
  } catch (e) { return fail(e); }
}

export async function addPuzzleAction(_: R, fd: FormData): Promise<R> {
  const u = await requireUser(["ADMIN", "COACH"]);
  try {
    const fen = String(fd.get("fen") || "").trim();
    const moves = String(fd.get("moves") || "").trim().split(/[\s,]+/).filter(Boolean).map((m) => m.toLowerCase());
    const err = validatePuzzle(fen, moves);
    if (err) throw new Error(err);
    const rating = Number(fd.get("rating"));
    if (!(rating >= 400 && rating <= 3000)) throw new Error("Рейтинг задачи 400–3000");
    const title = String(fd.get("title") || "").trim();
    if (!title) throw new Error("Укажите название");
    const count = await db.puzzle.count();
    let code = `P${String(count + 1).padStart(3, "0")}`;
    while (await db.puzzle.findUnique({ where: { code } })) code = `P${Math.floor(Math.random() * 1e5)}`;
    await db.puzzle.create({
      data: { code, fen, moves: JSON.stringify(moves), rating, theme: String(fd.get("theme") || "sacrifice"), title, hint: String(fd.get("hint") || "") || null, createdById: u.id },
    });
    revalidatePath("/admin/puzzles");
    return { ok: `Задача ${code} добавлена` };
  } catch (e) { return fail(e); }
}

export async function togglePuzzleAction(fd: FormData) {
  await requireUser(["ADMIN", "COACH"]);
  const p = await db.puzzle.findUniqueOrThrow({ where: { id: String(fd.get("puzzleId")) } });
  await db.puzzle.update({ where: { id: p.id }, data: { active: !p.active } });
  revalidatePath("/admin/puzzles");
}
