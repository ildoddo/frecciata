import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Punto d'ingresso: manda ogni utente dove le sue credenziali lo portano.
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  redirect(session.user.role === "ADMIN" ? "/admin" : "/calendario");
}
