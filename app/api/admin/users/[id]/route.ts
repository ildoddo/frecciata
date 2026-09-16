import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/guards";
import { handleApi } from "@/lib/handle-api";
import { ApiError } from "@/lib/api-error";

const schema = z.object({
  active: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const session = await getSession();
    requireAdmin(session);

    // Previeni che l'admin disabiliti se stesso
    if (id === session?.user.id) {
      throw new ApiError(400, "Non puoi disabilitare il tuo stesso account");
    }

    const { active } = schema.parse(await req.json());

    await db.user.update({
      where: { id },
      data: { active },
    });

    return NextResponse.json({ ok: true });
  });
}
