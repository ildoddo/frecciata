"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { SlotCard, type Slot } from "@/components/slot-card";
import {
  addDays,
  fmtDayLong,
  fmtDaySmart,
  fmtRange,
  mondayOf,
  today,
  weekdayOf,
  WEEKDAY_SHORT,
} from "@/lib/format";

type Booking = {
  id: string;
  slotId: string;
  day: string;
  start: string;
  end: string;
  maxAthletes: number;
};

export default function CalendarioPage() {
  const toast = useToast();
  const [monday, setMonday] = useState(() => mondayOf(today()));
  const [view, setView] = useState<"week" | "day">("week");
  const [dayCursor, setDayCursor] = useState(() => today());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  );
  const [from, to] = view === "week" ? [days[0], days[6]] : [dayCursor, dayCursor];

  const refresh = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        api<{ slots: Slot[] }>(`/api/slots?from=${from}&to=${to}`),
        api<{ bookings: Booking[] }>("/api/me/bookings"),
      ]);
      setSlots(s.slots);
      setBookings(b.bookings);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossibile caricare i turni.", "err");
    } finally {
      setLoading(false);
    }
  }, [from, to, toast]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  async function book(slot: Slot) {
    setBusyId(slot.id);
    // aggiornamento ottimistico: il server resta l'autorità, lo stato torna
    // a quando serve.
    setSlots((all) =>
      all.map((s) =>
        s.id === slot.id ? { ...s, mine: true, booked: s.booked + 1 } : s.mine && s.day === slot.day ? { ...s, mine: false } : s
      )
    );
    try {
      await api("/api/bookings", { method: "POST", body: { slotId: slot.id } });
      toast("Turno prenotato. Ci vediamo in campo!");
      await refresh();
    } catch (e) {
      await refresh();
      toast(e instanceof Error ? e.message : "Prenotazione non riuscita.", "err");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(slot: Slot) {
    setBusyId(slot.id);
    setSlots((all) =>
      all.map((s) => (s.id === slot.id ? { ...s, mine: false, booked: s.booked - 1 } : s))
    );
    try {
      await api("/api/bookings", { method: "DELETE", body: { slotId: slot.id } });
      toast("Prenotazione annullata: il posto è libero.");
      await refresh();
    } catch (e) {
      await refresh();
      toast(e instanceof Error ? e.message : "Annullamento non riuscito.", "err");
    } finally {
      setBusyId(null);
    }
  }

  const now = new Date();
  const isPast = (s: Slot) => new Date(s.end).getTime() <= now.getTime();

  const byDay = (day: string) => slots.filter((s) => s.day === day);
  const nextBookings = bookings.slice(0, 3);

  return (
    <div>
      {/* Intestazione + navigazione */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CalendarDays className="h-5 w-5 text-target" aria-hidden />
        <h1 className="font-display text-xl font-semibold tracking-tight">Calendario allenamenti</h1>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() =>
              view === "week" ? setMonday((m) => addDays(m, -7)) : setDayCursor((d) => addDays(d, -1))
            }
            className="rounded-full border border-line p-1.5 hover:bg-line/40"
            aria-label="Precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMonday(mondayOf(today()));
              setDayCursor(today());
            }}
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-line/40"
          >
            Oggi
          </button>
          <button
            onClick={() =>
              view === "week" ? setMonday((m) => addDays(m, 7)) : setDayCursor((d) => addDays(d, 1))
            }
            className="rounded-full border border-line p-1.5 hover:bg-line/40"
            aria-label="Successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-full border border-line text-sm" role="tablist">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx(
                "px-3 py-1.5",
                view === v ? "bg-ink text-paper" : "text-ink-soft hover:bg-line/40"
              )}
            >
              {v === "week" ? "Settimana" : "Giorno"}
            </button>
          ))}
        </div>
      </div>

      {/* Le mie prossime prenotazioni */}
      {nextBookings.length > 0 && (
        <div className="mb-5 rounded-xl border border-lane/30 bg-lane/8 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-lane">Le mie prossime uscite</span>
            <Link href="/prenotazioni" className="text-xs font-medium text-ink underline underline-offset-2">
              Vedi tutte
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nextBookings.map((b) => (
              <span
                key={b.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium tabular-nums shadow-card"
              >
                {fmtDaySmart(b.day, today())} · {fmtRange(b.start, b.end)}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento turni…
        </div>
      ) : view === "week" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {days.map((d) => {
            const isToday = d === today();
            const daySlots = byDay(d);
            return (
              <section key={d} className={clsx("rounded-2xl border p-2.5", isToday ? "border-ink bg-white" : "border-line bg-white/60")}>
                <header className="mb-2 flex items-baseline gap-2 px-1">
                  <span className={clsx("font-display text-sm font-semibold", isToday && "text-target")}>
                    {WEEKDAY_SHORT[weekdayOf(d)]}
                  </span>
                  <span className="text-sm tabular-nums text-ink-soft">
                    {Number(d.slice(8, 10))}
                  </span>
                  {daySlots.length > 0 && (
                    <span className="ml-auto text-[11px] text-ink-soft">
                      {daySlots.length}
                    </span>
                  )}
                </header>
                <div className="space-y-2">
                  {daySlots.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-ink-soft/70">Nessun turno</p>
                  ) : (
                    daySlots.map((s) => (
                      <SlotCard
                        key={s.id}
                        slot={s}
                        past={isPast(s)}
                        busy={busyId === s.id}
                        onBook={() => book(s)}
                        onCancel={() => cancel(s)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-white/60 p-3">
          <header className="mb-3 px-1 font-display font-semibold">
            {fmtDayLong(from)}
          </header>
          <div className="grid gap-2 sm:grid-cols-2">
            {byDay(from).length === 0 ? (
              <p className="text-sm text-ink-soft">Nessun turno per questo giorno.</p>
            ) : (
              byDay(from).map((s) => (
                <SlotCard
                  key={s.id}
                  slot={s}
                  past={isPast(s)}
                  busy={busyId === s.id}
                  onBook={() => book(s)}
                  onCancel={() => cancel(s)}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
