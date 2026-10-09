"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

function isActive(path: string, href: string) {
  if (href === "/admin" || href === "/coach" || href === "/student" || href === "/parent") return path === href;
  return path === href || path.startsWith(href + "/");
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={isActive(path, i.href) ? "active" : ""}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={isActive(path, i.href) ? "active" : ""}>
          <span className="ic">{i.icon}</span>{i.label}
        </Link>
      ))}
    </nav>
  );
}
