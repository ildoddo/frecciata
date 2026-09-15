import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { handleApi } from "@/lib/handle-api";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const body = schema.parse(await req.json());

    const exists = await db.user.findUnique({ where: { email: body.email } });
    if (exists) {
      throw new ApiError(409, "Esiste già un account con questa email.");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      await db.user.create({
        data: { name: body.name, email: body.email, passwordHash, role: "ATLETA" },
      });
    } catch (e) {
      // la race tra "esiste già" e create finisce sul vincolo unico:
      // restituiamo il messaggio corretto
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ApiError(409, "Esiste già un account con questa email.");
      }
      throw e;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
