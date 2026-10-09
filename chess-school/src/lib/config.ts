// Бизнес-правила пилота собраны в одном месте, чтобы их легко было поменять.

export const TEST_MODE = (process.env.TEST_MODE ?? "true") === "true";

/** Перенос/отмена менее чем за столько часов до начала — занятие списывается. */
export const LATE_RESCHEDULE_HOURS = 2;

/** Паки карточек за каждое оплаченное занятие (10 занятий = 10 паков). */
export const PACKS_PER_LESSON = 1;

/** Стоимость занятия по умолчанию для формы оплаты, ₽. */
export const DEFAULT_LESSON_PRICE = 1500;

/** Стартовый рейтинг персонажа. */
export const START_RATING = 1000;

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Администратор",
  COACH: "Тренер",
  STUDENT: "Ученик",
  PARENT: "Родитель",
};

export const STUDY_CATEGORY_LABEL: Record<string, string> = {
  LESSON: "Занятие",
  HOMEWORK: "Домашка",
  TODO: "Доделать",
};

export const LESSON_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Запланировано",
  STARTED: "Идёт",
  DONE: "Проведено",
  CANCELLED: "Отменено",
};

export const LEDGER_REASON_LABEL: Record<string, string> = {
  PAYMENT: "Оплата",
  LESSON_START: "Старт урока",
  LATE_RESCHEDULE: "Поздний перенос",
  LATE_CANCEL: "Поздняя отмена",
  MANUAL: "Корректировка",
};
