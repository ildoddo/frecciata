import { NextResponse } from "next/server";

/** Errore di business con status HTTP; i route handler lo traducono in JSON. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function apiError(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json(
    { error: "Errore imprevisto. Riprova." },
    { status: 500 }
  );
}
