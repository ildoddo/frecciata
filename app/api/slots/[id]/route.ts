import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireAdmin, requireUser } from "@/lib/guards";
import { ApiError } from "@/lib/api-error";
import { updateSlot, deleteSlot } from "@/lib/rules";
import { handleApi } from "@/lib/handle-api";

const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxAthletes: z.number().int().min(1).max(100),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { id } = await params;
    requireUser(await getSession()); // login richiesto
    const slot = await db.trainingSlot.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!slot) throw new ApiError(404, "Turno non trovato.");
    return NextResponse.json({
      id: slot.id,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      maxAthletes: slot.maxAthletes,
      booked: slot._count.bookings,
      ruleId: slot.recurringRuleId,
    });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    requireAdmin(await getSession());
    const input = patchSchema.parse(await req.json());
    await updateSlot(id, input);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    requireAdmin(await getSession());
    const { canceled } = await deleteSlot(id);
    return NextResponse.json({ ok: true, canceled });
  });
}
