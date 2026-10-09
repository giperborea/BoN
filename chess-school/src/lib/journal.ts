import { db } from "./db";
import { LATE_RESCHEDULE_HOURS, PACKS_PER_LESSON } from "./config";
import { checkAchievements } from "./achievements";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Единственная точка изменения баланса занятий: всегда пишет запись в журнал движения. */
export async function changeBalance(tx: Tx, p: {
  studentId: string; delta: number; reason: string; comment?: string;
  lessonId?: string; paymentId?: string; createdById?: string; at?: Date;
}) {
  const u = await tx.user.update({ where: { id: p.studentId }, data: { lessonBalance: { increment: p.delta } } });
  await tx.balanceTx.create({
    data: {
      studentId: p.studentId, delta: p.delta, balance: u.lessonBalance, reason: p.reason, comment: p.comment,
      lessonId: p.lessonId, paymentId: p.paymentId, createdById: p.createdById, createdAt: p.at,
    },
  });
  return u.lessonBalance;
}

/** Оплата: +N занятий и +N паков (10 занятий = 10 паков). */
export async function addPayment(p: { studentId: string; amountRub: number; lessons: number; comment?: string; createdById?: string; at?: Date }) {
  if (p.lessons <= 0) throw new Error("Количество занятий должно быть больше нуля");
  const packs = p.lessons * PACKS_PER_LESSON;
  return db.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: { studentId: p.studentId, amountRub: p.amountRub, lessons: p.lessons, packs, comment: p.comment, createdById: p.createdById, createdAt: p.at },
    });
    await changeBalance(tx, { studentId: p.studentId, delta: p.lessons, reason: "PAYMENT", paymentId: pay.id, createdById: p.createdById, at: p.at, comment: `${p.lessons} зан., +${packs} паков` });
    await tx.user.update({ where: { id: p.studentId }, data: { packs: { increment: packs } } });
    return pay;
  });
}

/** Старт урока: списывает 1 занятие (баланс может уйти в минус). */
export async function startLesson(lessonId: string, byUserId?: string, at: Date = new Date()) {
  await db.$transaction(async (tx) => {
    const l = await tx.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    if (l.status !== "SCHEDULED") throw new Error("Урок уже начат или отменён");
    await tx.lesson.update({ where: { id: lessonId }, data: { status: "STARTED", startedAt: at } });
    await changeBalance(tx, { studentId: l.studentId, delta: -1, reason: "LESSON_START", lessonId, createdById: byUserId, at });
  });
  const l = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await checkAchievements(l.studentId, at);
}

export async function finishLesson(lessonId: string, at: Date = new Date()) {
  const l = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  if (l.status !== "STARTED") throw new Error("Урок не идёт");
  await db.lesson.update({ where: { id: lessonId }, data: { status: "DONE", finishedAt: at } });
}

/**
 * Перенос или отмена. Если до начала меньше LATE_RESCHEDULE_HOURS часов —
 * занятие жёстко списывается, факт фиксируется в истории переносов и журнале баланса.
 */
export async function rescheduleLesson(p: {
  lessonId: string; kind: "RESCHEDULE" | "CANCEL"; toTime?: Date; reason?: string; byUserId?: string; now?: Date;
}) {
  const now = p.now ?? new Date();
  return db.$transaction(async (tx) => {
    const l = await tx.lesson.findUniqueOrThrow({ where: { id: p.lessonId } });
    if (l.status !== "SCHEDULED") throw new Error("Переносить можно только запланированный урок");
    if (p.kind === "RESCHEDULE" && !p.toTime) throw new Error("Укажите новое время");
    const hoursBefore = (l.scheduledAt.getTime() - now.getTime()) / 3_600_000;
    const charged = hoursBefore < LATE_RESCHEDULE_HOURS;
    const r = await tx.reschedule.create({
      data: {
        lessonId: l.id, studentId: l.studentId, kind: p.kind, fromTime: l.scheduledAt, toTime: p.toTime,
        hoursBefore: Math.round(hoursBefore * 10) / 10, charged, reason: p.reason, initiatedById: p.byUserId, createdAt: now,
      },
    });
    if (charged) {
      await changeBalance(tx, {
        studentId: l.studentId, delta: -1, reason: p.kind === "CANCEL" ? "LATE_CANCEL" : "LATE_RESCHEDULE",
        lessonId: l.id, createdById: p.byUserId, at: now,
        comment: `За ${Math.max(0, Math.round(hoursBefore * 60))} мин. до начала`,
      });
    }
    if (p.kind === "CANCEL") await tx.lesson.update({ where: { id: l.id }, data: { status: "CANCELLED" } });
    else await tx.lesson.update({ where: { id: l.id }, data: { scheduledAt: p.toTime! } });
    return r;
  });
}
