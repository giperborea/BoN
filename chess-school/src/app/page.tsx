import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";

export default async function Home() {
  const u = await getUser();
  redirect(u ? homeFor(u.role) : "/login");
}
