import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentOverview } from "@/components/StudentOverview";

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const u = await requireUser(["PARENT"]);
  const children = await db.user.findMany({ where: { parentId: u.id }, orderBy: { name: "asc" } });
  const { child } = await searchParams;
  const cur = children.find((c) => c.id === child) ?? children[0];
  return (
    <>
      <div className="page-head"><h1>👨‍👧 Кабинет родителя</h1></div>
      {children.length > 1 && (
        <div className="tabs">{children.map((c) => <Link key={c.id} href={`?child=${c.id}`} className={c.id === cur?.id ? "active" : ""}>{c.name}</Link>)}</div>
      )}
      {cur ? (
        <>
          <h2>{cur.name}</h2>
          <StudentOverview studentId={cur.id} forParent />
        </>
      ) : <div className="empty">К вашему аккаунту пока не привязаны дети. Обратитесь к администратору школы.</div>}
    </>
  );
}
