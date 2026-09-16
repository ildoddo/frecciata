import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/guards";
import { ApiError } from "@/lib/api-error";
import { handleApi } from "@/lib/handle-api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La nuova password deve essere di almeno 8 caratteri"),
});

export async function PATCH(req: Request) {
  return handleApi(async () => {
    const user = requireUser(await getSession());
    const { currentPassword, newPassword } = schema.parse(await req.json());

    // Verifica la password corrente
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new ApiError(404, "Utente non trovato");

    const valid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!valid) {
      throw new ApiError(401, "Password corrente non corretta");
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Aggiorna la password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true });
  });
}
