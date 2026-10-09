import Link from "next/link";
import { getUser, needsConsent, needsLichess } from "@/lib/auth";
import { ROLE_LABEL, TEST_MODE } from "@/lib/config";
import { NavLinks, BottomNav, NavItem } from "./NavLinks";
import { logout } from "@/app/actions/auth";
import { Suspense } from "react";
import { Flash } from "./Flash";

const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Главная", icon: "🏠" },
  { href: "/game", label: "Игра", icon: "♞" },
  { href: "/cards", label: "Коллекция", icon: "🃏" },
  { href: "/achievements", label: "Ачивки", icon: "🏆" },
  { href: "/leaderboard", label: "Рейтинг", icon: "📊" },
  { href: "/student/studies", label: "Студии", icon: "📚" },
];
const COACH_NAV: NavItem[] = [
  { href: "/coach", label: "Уроки", icon: "📅" },
  { href: "/coach/homework", label: "Домашки", icon: "✍️" },
  { href: "/coach/students", label: "Ученики", icon: "👥" },
  { href: "/leaderboard", label: "Рейтинг", icon: "📊" },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Журнал", icon: "📒" },
  { href: "/admin/schedule", label: "Расписание", icon: "📅" },
  { href: "/admin/reschedules", label: "Переносы", icon: "🔁" },
  { href: "/admin/payments", label: "Оплаты", icon: "💳" },
  { href: "/coach/homework", label: "Домашки", icon: "✍️" },
  { href: "/admin/puzzles", label: "Задачи", icon: "🧩" },
  { href: "/admin/staff", label: "Люди", icon: "👥" },
  { href: "/leaderboard", label: "Рейтинг", icon: "📊" },
];
const PARENT_NAV: NavItem[] = [
  { href: "/parent", label: "Мои дети", icon: "👨‍👧" },
  { href: "/leaderboard", label: "Рейтинг", icon: "📊" },
];

export async function Shell({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  const gated = u && (needsConsent(u) || needsLichess(u));
  const items = !u || gated ? [] :
    u.role === "ADMIN" ? ADMIN_NAV : u.role === "COACH" ? COACH_NAV : u.role === "PARENT" ? PARENT_NAV : STUDENT_NAV;
  return (
    <>
      {TEST_MODE && <div className="test-banner">Тестовый режим пилота · данные вымышленные</div>}
      {u && (
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand"><span className="logo">♞</span><span>BoN Chess</span></Link>
            <NavLinks items={items} />
            <div className="userbox">
              <span className="uname">{u.name} · {ROLE_LABEL[u.role]}</span>
              <form action={logout}><button className="btn sm secondary" type="submit">Выйти</button></form>
            </div>
          </div>
        </header>
      )}
      <main className={u ? "container" : ""}>{u && <Suspense><Flash /></Suspense>}{children}</main>
      {u && items.length > 0 && <BottomNav items={items.slice(0, 6)} />}
    </>
  );
}
