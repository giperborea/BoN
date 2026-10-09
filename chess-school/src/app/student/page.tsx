import { requireUser } from "@/lib/auth";
import { StudentOverview } from "@/components/StudentOverview";

export default async function StudentHome() {
  const u = await requireUser(["STUDENT"]);
  return (
    <>
      <div className="page-head"><h1>Привет, {u.name.split(" ")[0]}! 👋</h1>{u.lichessUsername && <span className="badge">Lichess: @{u.lichessUsername}</span>}</div>
      <StudentOverview studentId={u.id} />
    </>
  );
}
