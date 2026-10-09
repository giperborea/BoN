/* eslint-disable no-console */
// Тестовые данные пилота: 1 админ, 4 тренера, 100 учеников, родители, оплаты, уроки,
// переносы, студии с оценками, игровая история, коллекции и достижения.
// Запуск: npm run db:seed (полностью перезаписывает базу).
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { rarityForRank, RARITIES, PACK_SIZE, PLAYABLE_TOP, STARTER_RANKS, rollRarity, Rarity } from "../src/lib/cards";
import { syncAchievementDefs, checkAchievements, ACHIEVEMENTS } from "../src/lib/achievements";
import { ratingDelta, xpFor, levelFromXp } from "../src/lib/game";
import { START_RATING, PACKS_PER_LESSON } from "../src/lib/config";

// ---------- детерминированный генератор ----------
let seed = 20261009;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p: number) => rnd() < p;
const HOUR = 3_600_000, DAY = 24 * HOUR;
const NOW = new Date();

const BOY = ["Артём", "Максим", "Иван", "Михаил", "Александр", "Даниил", "Тимофей", "Лев", "Марк", "Матвей", "Кирилл", "Егор", "Никита", "Фёдор", "Роман", "Илья", "Глеб", "Арсений", "Мирон", "Савелий"];
const GIRL = ["София", "Мария", "Анна", "Алиса", "Ева", "Виктория", "Полина", "Варвара", "Василиса", "Дарья", "Ксения", "Вера", "Милана", "Ульяна", "Есения"];
const SUR = ["Иванов", "Смирнов", "Кузнецов", "Попов", "Васильев", "Петров", "Соколов", "Михайлов", "Новиков", "Фёдоров", "Морозов", "Волков", "Алексеев", "Лебедев", "Семёнов", "Егоров", "Павлов", "Козлов", "Степанов", "Николаев", "Орлов", "Андреев", "Макаров", "Никитин", "Захаров", "Зайцев", "Соловьёв", "Борисов", "Яковлев", "Григорьев"];
const PARENT_M = ["Андрей", "Сергей", "Дмитрий", "Алексей", "Павел", "Олег", "Евгений"];
const PARENT_F = ["Елена", "Ольга", "Наталья", "Татьяна", "Ирина", "Светлана", "Екатерина", "Юлия"];
const translit = (s: string) => s.toLowerCase().replace(/[а-яё]/g, (c) => ({ а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" } as Record<string, string>)[c] ?? c);

const STUDY_TOPICS = ["Мат в один ход", "Вилка конём", "Связка", "Двойной удар", "Ладейный эндшпиль", "Итальянская партия", "Сицилианская защита", "Пешечный эндшпиль: правило квадрата", "Атака на короля", "Вскрытое нападение", "Отвлечение и завлечение", "Мат Легаля", "Ферзь против пешки", "Защита Каро-Канн", "Принципы дебюта", "Слабые поля", "Открытые линии", "Проходная пешка", "Мат двумя ладьями", "Оппозиция королей"];
const GRADE_COMMENTS = ["Отлично!", "Молодец, всё верно", "Есть ошибка во 2-й задаче", "Нужно внимательнее считать варианты", "Хорошо, но не доделано до конца", "Супер, так держать", ""];
const RESCHEDULE_REASONS = ["Болезнь", "Просьба родителя", "Школьное мероприятие", "Поездка", "Опоздание", "Тренер заболел"];
const PRICE = 1500;

type Ev = { t: Date };

async function wipe() {
  await db.userAchievement.deleteMany();
  await db.achievement.deleteMany();
  await db.puzzleAttempt.deleteMany();
  await db.character.deleteMany();
  await db.packOpening.deleteMany();
  await db.collectionItem.deleteMany();
  await db.study.deleteMany();
  await db.reschedule.deleteMany();
  await db.balanceTx.deleteMany();
  await db.lesson.deleteMany();
  await db.payment.deleteMany();
  await db.puzzle.deleteMany();
  await db.grandmaster.deleteMany();
  await db.user.updateMany({ data: { coachId: null, parentId: null } });
  await db.user.deleteMany();
}

function loadJson<T>(name: string): T {
  const candidates = [path.join(__dirname, "..", "data", name), path.join(process.cwd(), "data", name)];
  for (const p of candidates) if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  throw new Error(`Не найден файл data/${name}`);
}

async function main() {
  const t0 = Date.now();
  console.log("Очистка базы…");
  await wipe();
  await syncAchievementDefs();

  // ---------- гроссмейстеры ----------
  type GmJson = { rank: number; slug: string; name: string; nameEn: string; country: string; born: number | null; died: number | null; worldChampion: boolean; wcNumber: number | null; peakRating: number | null; style: string; fact: string };
  const gmsJson = loadJson<GmJson[]>("grandmasters.json");
  await db.grandmaster.createMany({
    data: gmsJson.map((g) => {
      const rarity = rarityForRank(g.rank);
      return { ...g, rarity, fragmentsNeeded: RARITIES[rarity].fragments, playable: g.rank <= PLAYABLE_TOP };
    }),
  });
  const gms = await db.grandmaster.findMany({ orderBy: { rank: "asc" } });
  const gmByRarity = new Map<string, typeof gms>();
  for (const g of gms) gmByRarity.set(g.rarity, [...(gmByRarity.get(g.rarity) ?? []), g]);
  console.log(`Гроссмейстеров: ${gms.length}`);

  // ---------- задачи ----------
  type PzJson = { code: string; fen: string; moves: string[]; rating: number; theme: string; title: string; hint?: string };
  const pzJson = loadJson<PzJson[]>("puzzles.json");
  await db.puzzle.createMany({ data: pzJson.map((p) => ({ code: p.code, fen: p.fen, moves: JSON.stringify(p.moves), rating: p.rating, theme: p.theme, title: p.title, hint: p.hint ?? null })) });
  const puzzles = await db.puzzle.findMany();
  console.log(`Задач: ${puzzles.length}`);

  // ---------- люди ----------
  const hash = await bcrypt.hash("demo123", 8);
  const consented = { consentAt: new Date(NOW.getTime() - 120 * DAY), consentType: "SELF" };
  const admin = await db.user.create({ data: { login: "andrey", name: "Андрей (админ)", role: "ADMIN", passwordHash: hash, lichessUsername: "andrey_bon", lichessLinkedAt: NOW } });
  const coachNames = ["Ольга Сергеевна Белова", "Дмитрий Игоревич Ковалёв", "Анна Викторовна Руденко", "Павел Андреевич Гусев"];
  const coaches = [];
  for (const [i, n] of coachNames.entries()) {
    coaches.push(await db.user.create({ data: { login: `coach${i + 1}`, name: n, role: "COACH", passwordHash: hash, lichessUsername: `bon_coach${i + 1}`, lichessLinkedAt: NOW, phone: `+7 900 000-00-0${i + 1}` } }));
  }

  // родители: p001..p080; ученики 61–80 — братья/сёстры (по двое на родителя)
  const parents: { id: string }[] = [];
  const parentFor = (i: number) => (i <= 60 ? i : i <= 80 ? 61 + Math.floor((i - 61) / 2) : null);
  const students: { id: string; idx: number; coachIdx: number; start: Date; perWeek: number; skill: number; gamer: number; lessonsEv: Ev[]; grade5Ev: Ev[] }[] = [];
  const parentCount = 70;
  for (let p = 1; p <= parentCount; p++) {
    const female = chance(0.75);
    const sur = pick(SUR) + (female ? "а" : "");
    parents.push(await db.user.create({
      data: {
        login: `p${String(p).padStart(3, "0")}`, name: `${female ? pick(PARENT_F) : pick(PARENT_M)} ${sur}`, role: "PARENT", passwordHash: hash,
        phone: `+7 9${int(10, 99)} ${int(100, 999)}-${int(10, 99)}-${int(10, 99)}`,
        ...(p === 2 ? {} : consented),
      },
    }));
  }
  for (let i = 1; i <= 100; i++) {
    const girl = chance(0.35);
    const sur = pick(SUR) + (girl ? "а" : "");
    const first = girl ? pick(GIRL) : pick(BOY);
    const coachIdx = (i - 1) % 4;
    const pIdx = parentFor(i);
    const login = `s${String(i).padStart(3, "0")}`;
    const isNew = i === 100;
    const noLichess = i === 99 || isNew;
    const u = await db.user.create({
      data: {
        login, name: `${first} ${sur}`, role: "STUDENT", passwordHash: hash, coachId: coaches[coachIdx].id,
        parentId: pIdx ? parents[pIdx - 1].id : null,
        lichessUsername: noLichess ? null : `${translit(first)}_${translit(sur).slice(0, 6)}${int(1, 99)}`,
        lichessLinkedAt: noLichess ? null : NOW,
        ...(isNew ? {} : { consentAt: consented.consentAt, consentType: chance(0.6) ? "PARENT" : "SELF", consentParentName: "Родитель (тест)" }),
      },
    });
    students.push({
      id: u.id, idx: i, coachIdx,
      start: new Date(NOW.getTime() - (isNew ? 0 : i <= 2 ? 110 : int(25, 120)) * DAY),
      perWeek: i <= 2 ? 2 : chance(0.3) ? 2 : 1,
      skill: i <= 2 ? 0.25 : rnd() * 0.6 - 0.3,
      gamer: i <= 2 ? 1 : isNew ? 0 : rnd(),
      lessonsEv: [], grade5Ev: [],
    });
  }
  console.log("Пользователи созданы");

  // ---------- оплаты, уроки, переносы, студии ----------
  for (const s of students) {
    if (s.idx === 100) continue;
    const coach = coaches[s.coachIdx];
    let balance = 0;
    const ledger: { delta: number; reason: string; at: Date; lessonId?: string; paymentId?: string; comment?: string }[] = [];
    let packsGranted = 0;
    const pay = async (at: Date) => {
      const lessons = pick([4, 8, 8, 10, 10, 12]);
      const p = await db.payment.create({ data: { studentId: s.id, amountRub: lessons * PRICE, lessons, packs: lessons * PACKS_PER_LESSON, createdById: admin.id, createdAt: at, comment: pick(["Перевод", "Наличные", "Карта", null]) } });
      balance += lessons; packsGranted += lessons * PACKS_PER_LESSON;
      ledger.push({ delta: lessons, reason: "PAYMENT", at, paymentId: p.id, comment: `${lessons} зан., +${lessons} паков` });
    };
    await pay(new Date(s.start.getTime() - DAY));
    const days = s.perWeek === 2 ? [1, 4] : [int(0, 5)];
    const hour = int(14, 19);
    const slots: Date[] = [];
    for (let d = new Date(s.start); d.getTime() < NOW.getTime() + 14 * DAY; d = new Date(d.getTime() + DAY)) {
      const dow = (d.getUTCDay() + 6) % 7;
      if (days.includes(dow)) slots.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 3, 0)));
    }
    for (const at of slots) {
      if (at > NOW) {
        await db.lesson.create({ data: { studentId: s.id, coachId: coach.id, scheduledAt: at } });
        continue;
      }
      if (balance <= 1 && chance(0.85)) await pay(new Date(at.getTime() - int(1, 3) * DAY));
      const r = rnd();
      if (r < 0.09) {
        // перенос/отмена
        const late = chance(0.35);
        const hoursBefore = late ? Math.round(rnd() * 19) / 10 : int(3, 48);
        const cancel = chance(0.3);
        const to = new Date(at.getTime() + int(1, 3) * DAY);
        const l = await db.lesson.create({ data: { studentId: s.id, coachId: coach.id, scheduledAt: cancel ? at : to, status: cancel ? "CANCELLED" : to > NOW ? "SCHEDULED" : "DONE", startedAt: !cancel && to <= NOW ? to : null, finishedAt: !cancel && to <= NOW ? new Date(to.getTime() + HOUR) : null } });
        const createdAt = new Date(at.getTime() - hoursBefore * HOUR);
        await db.reschedule.create({ data: { lessonId: l.id, studentId: s.id, kind: cancel ? "CANCEL" : "RESCHEDULE", fromTime: at, toTime: cancel ? null : to, hoursBefore, charged: late, reason: pick(RESCHEDULE_REASONS), initiatedById: chance(0.5) ? coach.id : admin.id, createdAt } });
        if (late) { balance -= 1; ledger.push({ delta: -1, reason: cancel ? "LATE_CANCEL" : "LATE_RESCHEDULE", at: createdAt, lessonId: l.id, comment: `За ${Math.round(hoursBefore * 60)} мин. до начала` }); }
        if (!cancel && to <= NOW) { balance -= 1; ledger.push({ delta: -1, reason: "LESSON_START", at: to, lessonId: l.id }); s.lessonsEv.push({ t: to }); }
        continue;
      }
      const l = await db.lesson.create({ data: { studentId: s.id, coachId: coach.id, scheduledAt: at, status: "DONE", startedAt: at, finishedAt: new Date(at.getTime() + HOUR), topic: pick(STUDY_TOPICS) } });
      balance -= 1;
      ledger.push({ delta: -1, reason: "LESSON_START", at, lessonId: l.id });
      s.lessonsEv.push({ t: at });
      // студии урока
      const mkStudy = (category: string, extra: object = {}) => ({
        lichessStudyId: Math.random().toString(36).slice(2, 10).padEnd(8, "x"), name: pick(STUDY_TOPICS), category,
        studentId: s.id, coachId: coach.id, lessonId: l.id, createdAt: new Date(at.getTime() + 50 * 60_000), ...extra,
      });
      const studies = [mkStudy("LESSON")];
      if (chance(0.75)) {
        const age = (NOW.getTime() - at.getTime()) / DAY;
        const graded = age > 3 ? chance(0.92) : chance(0.3);
        const base = 4 + s.skill * 2;
        const grade = graded ? Math.max(1, Math.min(5, Math.round(base + (rnd() - 0.5) * 2.2))) : null;
        const gradedAt = graded ? new Date(at.getTime() + int(1, 3) * DAY) : null;
        if (grade === 5) s.grade5Ev.push({ t: gradedAt! });
        studies.push(mkStudy("HOMEWORK", { grade, gradedAt, gradeComment: graded ? pick(GRADE_COMMENTS) || null : null }));
      }
      if (chance(0.2)) studies.push(mkStudy("TODO", { doneAt: chance(0.6) ? new Date(at.getTime() + 7 * DAY) : null }));
      await db.study.createMany({ data: studies.map((x) => ({ ...x, url: `https://lichess.org/study/${x.lichessStudyId}` })) });
    }
    // журнал баланса в хронологическом порядке
    ledger.sort((a, b) => a.at.getTime() - b.at.getTime());
    let run = 0;
    await db.balanceTx.createMany({ data: ledger.map((x) => { run += x.delta; return { studentId: s.id, delta: x.delta, balance: run, reason: x.reason, comment: x.comment, lessonId: x.lessonId, paymentId: x.paymentId, createdById: x.reason === "PAYMENT" ? admin.id : coach.id, createdAt: x.at }; }) });
    await db.user.update({ where: { id: s.id }, data: { lessonBalance: run, packs: packsGranted } });
  }
  console.log("Журнал занятий заполнен");

  // демо-уроки на сегодня у coach1 (для проверки «Начать» и поздних переносов)
  const s1 = students[0], s5 = students[4], s9 = students[8];
  await db.lesson.create({ data: { studentId: s1.id, coachId: coaches[0].id, scheduledAt: new Date(NOW.getTime() + 60 * 60_000), topic: "Демо: до начала < 2 ч — перенос со списанием" } });
  await db.lesson.create({ data: { studentId: s5.id, coachId: coaches[0].id, scheduledAt: new Date(NOW.getTime() + 5 * HOUR), topic: "Демо: до начала > 2 ч — перенос без списания" } });
  await db.lesson.create({ data: { studentId: s9.id, coachId: coaches[0].id, scheduledAt: new Date(NOW.getTime() - 10 * 60_000), topic: "Демо: урок пора начинать" } });

  // ---------- игра, коллекция ----------
  const starters = gms.filter((g) => g.rank >= STARTER_RANKS.from && g.rank <= STARTER_RANKS.to);
  for (const s of students) {
    if (s.idx === 100) continue;
    const user = await db.user.findUniqueOrThrow({ where: { id: s.id } });
    // коллекция: открываем часть паков
    const coll = new Map<string, { fragments: number; collectedAt: Date | null }>();
    let shards = 0;
    const opened = Math.floor(user.packs * (s.idx <= 2 ? 0.75 : 0.5 + rnd() * 0.5));
    const openings: { userId: string; result: string; openedAt: Date }[] = [];
    for (let p = 0; p < opened; p++) {
      const at = new Date(s.start.getTime() + rnd() * (NOW.getTime() - s.start.getTime()));
      const res = [];
      for (let k = 0; k < PACK_SIZE; k++) {
        const rar = rollRarity(rnd) as Rarity;
        const g = pick(gmByRarity.get(rar)!);
        const it = coll.get(g.id) ?? { fragments: 0, collectedAt: null };
        let dup = false, completed = false;
        if (it.collectedAt) { dup = true; shards += RARITIES[rar].shardValue; }
        else { it.fragments++; if (it.fragments >= g.fragmentsNeeded) { it.collectedAt = at; completed = true; } }
        coll.set(g.id, it);
        res.push({ gmId: g.id, slug: g.slug, name: g.name, rarity: g.rarity, rank: g.rank, duplicate: dup, shards: dup ? RARITIES[rar].shardValue : 0, completed, fragments: it.fragments, needed: g.fragmentsNeeded });
      }
      openings.push({ userId: s.id, result: JSON.stringify(res), openedAt: at });
    }
    // игра
    const plays = s.gamer > 0.25;
    let starterId: string | null = null;
    if (plays) {
      starterId = pick(starters).id;
      const g = gms.find((x) => x.id === starterId)!;
      coll.set(g.id, { fragments: g.fragmentsNeeded, collectedAt: s.start });
    }
    await db.collectionItem.createMany({ data: [...coll.entries()].map(([gmId, v]) => ({ userId: s.id, gmId, ...v })) });
    if (openings.length) await db.packOpening.createMany({ data: openings });
    await db.user.update({ where: { id: s.id }, data: { packs: user.packs - opened, shards, starterTaken: plays } });
    if (!plays) continue;

    // персонажи: иногда игрок менял гроссмейстера
    const ownedPlayable = [...coll.entries()].filter(([id, v]) => v.collectedAt && gms.find((x) => x.id === id)!.playable).map(([id]) => id);
    const chain = [starterId!];
    if (ownedPlayable.length > 1 && chance(0.15)) chain.push(pick(ownedPlayable.filter((x) => x !== starterId)));
    const total = s.idx <= 2 ? 140 : Math.floor(s.gamer * s.gamer * 260);
    const span = NOW.getTime() - s.start.getTime();
    let t = s.start.getTime() + DAY;
    for (const [ci, gmId] of chain.entries()) {
      const n = chain.length > 1 && ci === 0 ? Math.floor(total * 0.4) : chain.length > 1 ? Math.ceil(total * 0.6) : total;
      let rating = START_RATING, peak = rating, xp = 0, solved = 0, failed = 0, streak = 0, best = 0;
      const ch = await db.character.create({ data: { userId: s.id, gmId, createdAt: new Date(t), active: ci === chain.length - 1 } });
      const attempts = [];
      const recent: string[] = [];
      for (let k = 0; k < n; k++) {
        t += span / Math.max(1, total) * (0.3 + rnd() * 1.4);
        if (t > NOW.getTime() - 60_000) t = NOW.getTime() - int(1, 50) * 60_000;
        let pool = puzzles.filter((p) => Math.abs(p.rating - rating) <= 250 && !recent.includes(p.id));
        if (!pool.length) pool = puzzles.filter((p) => !recent.includes(p.id));
        if (!pool.length) pool = puzzles;
        const pz = pick(pool);
        recent.unshift(pz.id); recent.length = Math.min(recent.length, 10);
        const strength = rating + 120 + s.skill * 500 + Math.min(300, k * 2);
        const success = chance(1 / (1 + Math.pow(10, (pz.rating - strength) / 400)));
        const d = ratingDelta(rating, pz.rating, success, solved + failed);
        const before = rating;
        rating = Math.max(400, rating + d); peak = Math.max(peak, rating);
        xp += xpFor(pz.rating, success);
        if (success) { solved++; streak++; best = Math.max(best, streak); } else { failed++; streak = 0; }
        attempts.push({ userId: s.id, characterId: ch.id, puzzleId: pz.id, status: success ? "SOLVED" : "FAILED", step: 0, ratingBefore: before, ratingAfter: rating, xpGained: xpFor(pz.rating, success), createdAt: new Date(t), finishedAt: new Date(t + 40_000) });
      }
      if (attempts.length) await db.puzzleAttempt.createMany({ data: attempts });
      await db.character.update({ where: { id: ch.id }, data: { rating, peak, xp, solved, failed, streak, bestStreak: best, endedAt: ci === chain.length - 1 ? null : new Date(t) } });
    }
  }
  console.log("Игровая история и коллекции созданы");

  // ---------- достижения с правдоподобными датами ----------
  for (const s of students) {
    if (s.idx === 100) continue;
    await checkAchievements(s.id, NOW);
    const ua = await db.userAchievement.findMany({ where: { userId: s.id }, include: { achievement: true } });
    if (!ua.length) continue;
    const attempts = await db.puzzleAttempt.findMany({ where: { userId: s.id }, orderBy: { createdAt: "asc" }, include: { puzzle: true } });
    const solvedAt = attempts.filter((a) => a.status === "SOLVED").map((a) => a.createdAt);
    const firstWhen = (pred: (a: typeof attempts[number], i: number) => boolean) => attempts.find(pred)?.createdAt;
    let xpRun = 0;
    const levelAt: Record<number, Date> = {};
    for (const a of attempts) { xpRun += a.xpGained; const lv = levelFromXp(xpRun); if (!levelAt[lv]) levelAt[lv] = a.createdAt; }
    const randomDate = () => new Date(s.start.getTime() + rnd() * (NOW.getTime() - s.start.getTime()));
    for (const x of ua) {
      const def = ACHIEVEMENTS.find((d) => d.code === x.achievement.code)!;
      let at: Date | undefined;
      switch (def.metric) {
        case "solved": at = solvedAt[def.threshold - 1]; break;
        case "peakRating": at = firstWhen((a) => (a.ratingAfter ?? 0) >= def.threshold); break;
        case "hardSolved": at = firstWhen((a) => a.status === "SOLVED" && a.puzzle.rating >= 1800); break;
        case "mateSolved": at = attempts.filter((a) => a.status === "SOLVED" && a.puzzle.theme.startsWith("mate"))[def.threshold - 1]?.createdAt; break;
        case "level": at = Object.entries(levelAt).find(([lv]) => Number(lv) >= def.threshold)?.[1]; break;
        case "lessons": at = s.lessonsEv.sort((a, b) => a.t.getTime() - b.t.getTime())[def.threshold - 1]?.t; break;
        case "grade5": at = s.grade5Ev.sort((a, b) => a.t.getTime() - b.t.getTime())[def.threshold - 1]?.t; break;
      }
      await db.userAchievement.update({ where: { id: x.id }, data: { earnedAt: at && at <= NOW ? at : randomDate() } });
    }
  }
  console.log("Достижения выданы");

  const counts = {
    users: await db.user.count(), lessons: await db.lesson.count(), payments: await db.payment.count(),
    reschedules: await db.reschedule.count(), studies: await db.study.count(), attempts: await db.puzzleAttempt.count(),
    achievements: await db.userAchievement.count(),
  };
  console.log("Готово за", ((Date.now() - t0) / 1000).toFixed(1), "с", counts);
  console.log("Вход: andrey / coach1..coach4 / s001..s100 / p001..p070 — пароль demo123");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
