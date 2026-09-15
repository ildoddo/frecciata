import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/guards";
import { bookSlot, cancelBooking } from "@/lib/rules";
import { handleApi } from "@/lib/handle-api";

const schema = z.object({ slotId: z.string().min(1) });

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = requireUser(await getSession(req)); // 401 se non loggato
    const { slotId } = schema.parse(await req.json());
    await bookSlot(user.id, slotId);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return handleApi(async () => {
    const user = requireUser(await getSession(req));
    const { slotId } = schema.parse(await req.json());
    await cancelBooking(user.id, slotId);
    return NextResponse.json({ ok: true });
  });
}
