import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAdmin } from "@/lib/guards";
import { listSlots, createSlot, type SlotInput } from "@/lib/rules";
import { handleApi } from "@/lib/handle-api";

const listSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  all: z.coerce.boolean().optional(),
  athletes: z.coerce.boolean().optional(),
});

// Calendario (atleti) o elenco admin con gli iscritti, via query params.
export async function GET(req: Request) {
  return handleApi(async () => {
    const url = new URL(req.url);
    // ?from=...&to=...&all=true&athletes=true (booleani espliciti: "false" -> false)
    const q = listSchema.parse(
      Object.fromEntries(
        [...url.searchParams.entries()].map(([k, v]) => [
          k,
          v === "true" ? true : v === "false" ? false : v,
        ])
      )
    );

    // La sessione è opzionale (gli admin la usano, ma il calendario si
    // attraversa anche da pagina; il login vero arriva nel middleware UI).
    let session: Awaited<ReturnType<typeof getSession>> = null;
    try {
      session = await getSession(req);
    } catch {
      session = null;
    }

    // ?athletes=true è riservato agli admin (elenco iscritti per turno)
    if (q.athletes) requireAdmin(session);

    const slots = await listSlots({
      userId: session?.user.id ?? null,
      fromDay: q.from,
      toDay: q.to,
      includePast: q.all,
      withAthletes: q.athletes,
    });
    return NextResponse.json({ slots });
  });
}

const createSchema: z.ZodType<SlotInput> = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxAthletes: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    requireAdmin(await getSession(req));
    const input = createSchema.parse(await req.json());
    const slot = await createSlot(input);
    return NextResponse.json({ id: slot.id }, { status: 201 });
  });
}
