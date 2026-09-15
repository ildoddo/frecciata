import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { ApiError } from "./api-error";

/** Sessione per server components e route handler. */
export async function getSession(req?: Request): Promise<Session | null> {
  // Nei route handler il cookie arriva dalla Request: la passiamo
  // esplicitamente per non dipendere dai global di runtime.
  if (req) {
    return getServerSession(authOptions, req as NextRequest, new Response());
  }
  return getServerSession(authOptions);
}

/** 401 se la sessione non c'è. */
export function requireUser(session: Session | null) {
  if (!session?.user?.id) {
    throw new ApiError(401, "Accesso non autorizzato: fai il login.");
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
