import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { ApiError } from "./api-error";

/** Sessione per server components e route handler. */
export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/** 401 se la sessione non c'è. */
export function requireUser(session: Session | null) {
  if (!session?.user?.id) {
    throw new ApiError(401, "Accesso non autorizzato: fai il login.");
  }

  // Blocca utenti disabilitati
  if (session.user.active === false) {
    throw new ApiError(403, "Account disabilitato. Contatta l'amministrazione.");
  }

  return session.user;
}

/** 401 senza sessione, 403 se non ADMIN. */
export function requireAdmin(session: Session | null) {
  const user = requireUser(session);
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Riservato all'amministrazione.");
  }
  return user;
}
