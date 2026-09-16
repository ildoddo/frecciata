import { db } from "./db";
import { ApiError } from "./api-error";
import { localDay, addDay, weekdayOf, zonedToUtc, dayRangeUtc } from "./tz";
import { Prisma, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// VINCOLO "UN TURNO AL GIORNO"
// La colonna Booking.day è la data solare locale del turno (calcolata a
// prenotazione). Il vincolo unico (userId, day) nel database lo rende
// indistruttibile anche in caso di race: qui ripetiamo il controllo per dare
// un messaggio d'errore leggibile invece di un codice Prisma.
// ---------------------------------------------------------------------------

export async function bookSlot(userId: string, slotId: string) {
  const slot = await db.trainingSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new ApiError(404, "Turno non trovato.");
  if (slot.end.getTime() <= Date.now()) {
    throw new ApiError(400, "Questo turno è già passato.");
  }

  const day = localDay(slot.start);
  await db.$transaction(async (tx) => {
    const already = await tx.booking.findFirst({ where: { userId, slotId } });
    if (already) throw new ApiError(409, "Sei già iscritto a questo turno.");

    const count = await tx.booking.count({ where: { slotId } });
    if (count >= slot.maxAthletes) {
      throw new ApiError(409, "Il turno è completo: non ci sono più posti.");
    }

    const sameDay = await tx.booking.findFirst({ where: { userId, day } });
    if (sameDay) {
      throw new ApiError(
        409,
        "Hai già un altro turno prenotato in quel giorno: puoi prenotare un solo turno al giorno."
      );
    }

    await tx.booking.create({ data: { userId, slotId, day } });
  });
}

export async function cancelBooking(userId: string, slotId: string) {
  // deleteMany: idempotente, libera il posto (o no-op se già annullata)
  await db.booking.deleteMany({ where: { userId, slotId } });
}

// ---------------------------------------------------------------------------
// TURNI (singoli e ricorrenti)
// ---------------------------------------------------------------------------

export type SlotInput = {
  date: string; // YYYY-MM-DD (locale)
  startTime: string; // "HH:mm"
  endTime: string;
  maxAthletes: number;
};

function slotInputToDates(input: SlotInput) {
  const start = zonedToUtc(input.date, input.startTime);
  const end = zonedToUtc(input.date, input.endTime);
  if (end <= start) {
    throw new ApiError(400, "L'ora di fine deve essere successiva a quella di inizio.");
  }
  if (start.getTime() <= Date.now()) {
    throw new ApiError(400, "Il turno deve essere in un orario futuro.");
  }
  return { start, end };
}

export async function createSlot(input: SlotInput & { ruleId?: string }) {
  const { start, end } = slotInputToDates(input);
  return db.trainingSlot.create({
    data: {
      start,
      end,
      maxAthletes: input.maxAthletes,
      recurringRuleId: input.ruleId,
    },
  });
}

export async function updateSlot(
  id: string,
  input: SlotInput & { ruleId?: string | null }
) {
  const slot = await db.trainingSlot.findUnique({
    where: { id },
    include: { bookings: true },
  });
  if (!slot) throw new ApiError(404, "Turno non trovato.");

  const { start, end } = slotInputToDates(input);
  const oldDay = localDay(slot.start);
  const newDay = localDay(start);

  await db.$transaction(async (tx) => {
    // Se il giorno solare cambia, si trasporta anche la colonna `day` delle
    // prenotazioni (che alimenta il vincolo unico userId+day).
    if (newDay !== oldDay) {
      for (const b of slot.bookings) {
        const conflict = await tx.booking.findFirst({
          where: { userId: b.userId, day: newDay, NOT: { id: b.id } },
        });
        if (conflict) {
          throw new ApiError(
            409,
            "Spostamento non possibile: un iscritto avrebbe già un altro turno nel nuovo giorno."
          );
        }
        await tx.booking.update({ where: { id: b.id }, data: { day: newDay } });
      }
    }

    await tx.trainingSlot.update({
      where: { id },
      data: { start, end, maxAthletes: input.maxAthletes },
    });
  });
}

/** Elimina il turno; le prenotazioni collegate cadono in cascata. */
export async function deleteSlot(id: string) {
  const slot = await db.trainingSlot.findUnique({
    where: { id },
    include: { bookings: true },
  });
  if (!slot) throw new ApiError(404, "Turno non trovato.");
  await db.trainingSlot.delete({ where: { id } });
  return { canceled: slot.bookings.length };
}

// ---------------------------------------------------------------------------
// REGOLE RICORRENTI
// ---------------------------------------------------------------------------

export type RuleInput = {
  label: string | null;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD
  maxAthletes: number;
};

function validateRuleInput(input: RuleInput) {
  if (input.daysOfWeek.length === 0) {
    throw new ApiError(400, "Seleziona almeno un giorno della settimana.");
  }
  if (input.endsOn < input.startsOn) {
    throw new ApiError(400, "La fine della ricorrenza non può precedere l'inizio.");
  }
  if (input.endTime <= input.startTime) {
    throw new ApiError(400, "L'ora di fine deve essere successiva a quella di inizio.");
  }
  if (input.startsOn < localDay(Date.now())) {
    throw new ApiError(400, "La ricorrenza deve iniziare oggi o più avanti.");
  }
}

/**
 * Espande la regola nelle singole occorrenze: per ogni giorno del range
 * che cade su uno dei giorni selezionati, crea un turno con gli orari dati.
 * (Aritmetica su stringhe ISO: stabile attraverso salti di ora DST.)
 */
export function expandRule(
  rule: Pick<RuleInput, "daysOfWeek" | "startTime" | "endTime" | "startsOn" | "endsOn" | "maxAthletes">
): { start: Date; end: Date; maxAthletes: number }[] {
  const out: { start: Date; end: Date; maxAthletes: number }[] = [];
  let day = rule.startsOn;
  while (day <= rule.endsOn) {
    if (rule.daysOfWeek.includes(weekdayOf(day))) {
      out.push({
        start: zonedToUtc(day, rule.startTime),
        end: zonedToUtc(day, rule.endTime),
        maxAthletes: rule.maxAthletes,
      });
    }
    day = addDay(day);
    if (out.length > 1500) {
      throw new ApiError(400, "Range di ricorrenza troppo lungo (max ~5 anni).");
    }
  }
  if (out.length === 0) {
    throw new ApiError(400, "La ricorrenza non genera nessun turno nel range scelto.");
  }
  return out;
}

export async function createRule(input: RuleInput) {
  validateRuleInput(input);
  const occurrences = expandRule(input);
  const startsOn = zonedToUtc(input.startsOn, "12:00");
  const endsOn = zonedToUtc(input.endsOn, "12:00");

  return db.$transaction(async (tx) => {
    const rule = await tx.recurringRule.create({
      data: {
        label: input.label || null,
        daysOfWeek: [...input.daysOfWeek].sort((a, b) => a - b),
        startTime: input.startTime,
        endTime: input.endTime,
        startsOn,
        endsOn,
        maxAthletes: input.maxAthletes,
      },
    });
    await tx.trainingSlot.createMany({
      data: occurrences.map((o) => ({
        ...o,
        recurringRuleId: rule.id,
      })),
    });
    return rule;
  });
}

export async function updateRule(id: string, input: RuleInput) {
  validateRuleInput(input);
  const rule = await db.recurringRule.findUnique({ where: { id } });
  if (!rule) throw new ApiError(404, "Regola non trovata.");

  const sameSchedule =
    localDay(rule.startsOn) === input.startsOn &&
    localDay(rule.endsOn) === input.endsOn &&
    rule.startTime === input.startTime &&
    rule.endTime === input.endTime &&
    [...rule.daysOfWeek].sort((a, b) => a - b).join(",") ===
      [...input.daysOfWeek].sort((a, b) => a - b).join(",");

  await db.$transaction(async (tx) => {
    // Cambi di giorni/orare/range -> rigenera i turni (le prenotazioni sui
    // turni rigenerati vengono rimosse: sono spostamenti, non un luogo dove
    // un atleta avrebbe "il suo" posto).
    if (!sameSchedule) {
      await tx.trainingSlot.deleteMany({ where: { recurringRuleId: id } });
      const occurrences = expandRule(input);
      await tx.trainingSlot.createMany({
        data: occurrences.map((o) => ({ ...o, recurringRuleId: id })),
      });
    } else if (rule.maxAthletes !== input.maxAthletes) {
      // Solo la capienza cambia: le prenotazioni restano intatte.
      await tx.trainingSlot.updateMany({
        where: { recurringRuleId: id },
        data: { maxAthletes: input.maxAthletes },
      });
    }

    await tx.recurringRule.update({
      where: { id },
      data: {
        label: input.label || null,
        daysOfWeek: [...input.daysOfWeek].sort((a, b) => a - b),
        startTime: input.startTime,
        endTime: input.endTime,
        startsOn: zonedToUtc(input.startsOn, "12:00"),
        endsOn: zonedToUtc(input.endsOn, "12:00"),
        maxAthletes: input.maxAthletes,
      },
    });
  });
}

export async function deleteRule(id: string) {
  const rule = await db.recurringRule.findUnique({
    where: { id },
    include: { _count: { select: { slots: true } } },
  });
  if (!rule) throw new ApiError(404, "Regola non trovata.");
  // cascata: regola -> suoi turni -> loro prenotazioni
  await db.recurringRule.delete({ where: { id } });
  return { slots: rule._count.slots };
}

// ---------------------------------------------------------------------------
// LEE PER CALENDARIO / RIASSUNTI
// ---------------------------------------------------------------------------

export type PublicSlot = {
  id: string;
  day: string; // YYYY-MM-DD locale
  start: string; // ISO
  end: string; // ISO
  maxAthletes: number;
  booked: number;
  mine: boolean; // l'utente ha già prenotato questo turno?
  ruleLabel: string | null;
  athletes?: { name: string; email: string; role: Role }[];
};

export async function listSlots(opts: {
  userId: string | null;
  fromDay?: string; // YYYY-MM-DD locale
  toDay?: string;
  includePast?: boolean;
  withAthletes?: boolean;
}) {
  let fromUtc: Date;
  let toUtc: Date;
  if (opts.fromDay && opts.toDay) {
    fromUtc = dayRangeUtc(opts.fromDay).start;
    toUtc = dayRangeUtc(opts.toDay).end;
  } else if (opts.includePast) {
    fromUtc = new Date(0);
    toUtc = new Date(Date.now() + 60 * 24 * 3600 * 1000);
  } else {
    fromUtc = new Date();
    toUtc = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  }

  const base = {
    _count: { select: { bookings: true } },
    rule: { select: { label: true, daysOfWeek: true } },
  } satisfies Prisma.TrainingSlotInclude;

  const include: Prisma.TrainingSlotInclude = opts.withAthletes
    ? {
        ...base,
        bookings: {
          select: { user: { select: { name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      }
    : base;

  const slots = await db.trainingSlot.findMany({
    where: { start: { gte: fromUtc, lt: toUtc } },
    include,
    orderBy: { start: "asc" },
  });

  const mySlotIds = opts.userId
    ? new Set(
        (
          await db.booking.findMany({
            where: {
              userId: opts.userId,
              slot: { start: { gte: fromUtc, lt: toUtc } },
            },
            select: { slotId: true },
          })
        ).map((b) => b.slotId)
      )
    : new Set<string>();

  return slots.map((s: any) => ({
    id: s.id,
    day: localDay(s.start),
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    maxAthletes: s.maxAthletes,
    booked: s._count.bookings,
    mine: mySlotIds.has(s.id),
    ruleLabel: s.rule?.label ?? null,
    athletes: opts.withAthletes
      ? s.bookings.map((b: any) => ({ name: b.user.name, email: b.user.email, role: b.user.role }))
      : undefined,
  }));
}

export async function listMyBookings(userId: string) {
  const rows = await db.booking.findMany({
    where: { userId, slot: { end: { gt: new Date() } } },
    include: { slot: { select: { start: true, end: true, maxAthletes: true } } },
    orderBy: { slot: { start: "asc" } },
  });
  return rows.map((b) => ({
    id: b.id,
    slotId: b.slotId,
    day: b.day,
    start: b.slot.start.toISOString(),
    end: b.slot.end.toISOString(),
    maxAthletes: b.slot.maxAthletes,
  }));
}
