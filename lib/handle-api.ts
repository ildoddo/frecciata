import { NextResponse } from "next/server";
import { ApiError } from "./api-error";
import { Prisma } from "@prisma/client";

// Wrapper unificato: mappa errori di dominio e Prisma in risposte JSON.
export async function handleApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // Il vincolo unico (userId, day) arriva qui come P2002 in caso di race
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "Hai già un altro turno prenotato in quel giorno." },
          { status: 409 }
        );
      }
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Risorsa non trovata." }, { status: 404 });
      }
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: "Dati non validi: controlla gli input." },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Errore imprevisto. Riprova tra poco." },
      { status: 500 }
    );
  }
}
