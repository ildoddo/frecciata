"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { fmtDayLong, fmtRange } from "@/lib/format";

type Booking = {
  id: string;
  slotId: string;
  day: string;
  start: string;
  end: string;
  maxAthletes: number;
};

export default function PrenotazioniPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ bookings: Booking[] }>("/api/me/bookings");
      setBookings(res.bookings);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function cancel(b: Booking) {
    setCanceling(b.id);
    try {
      await api("/api/bookings", { method: "DELETE", body: { slotId: b.slotId } });
      toast("Prenotazione annullata: il posto è di nuovo libero.");
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setCanceling(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Le mie prenotazioni</h1>
        <p className="mt-1 text-sm text-ink-soft">
          I tuoi allenamenti futuri. Un solo turno al giorno: per cambiarlo, annulla e prenota quello nuovo.
        </p>
      </header>

      {error && <p className="mb-4 rounded-lg border border-target/30 bg-target/5 p-3 text-sm font-medium text-target">{error}</p>}

      {!bookings && !error ? (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico…
        </div>
      ) : bookings && bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center">
          <CalendarPlus className="mx-auto h-8 w-8 text-ink-soft/60" aria-hidden />
          <p className="mt-3 font-medium">Nessuna prenotazione in corso</p>
          <p className="mt-1 text-sm text-ink-soft">
            Scegli il tuo allenamento dal{" "}
            <Link href="/calendario" className="font-medium text-ink underline underline-offset-2">
              calendario
            </Link>
            .
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {bookings?.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold">{fmtDayLong(b.day)}</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink-soft">{fmtRange(b.start, b.end)}</p>
              </div>
              <button
                onClick={() => cancel(b)}
                disabled={canceling === b.id}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-target hover:text-target disabled:opacity-50"
              >
                {canceling === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Annulla
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Errore imprevisto.";
}
