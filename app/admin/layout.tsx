import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Doppio scudo: il middleware blocca a livello edge, qui verifichiamo la
// sessione lato server per i render.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=%2Fadmin");
  if (session.user.role !== "ADMIN") redirect("/calendario");
  return <>{children}</>;
}
