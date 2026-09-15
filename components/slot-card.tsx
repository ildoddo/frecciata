"use client";

import { Check, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { fmtRange } from "@/lib/format";

export type Slot = {
  id: string;
  day: string;
  start: string;
  end: string;
  maxAthletes: number;
  booked: number;
  mine: boolean;
  ruleLabel?: string | null;
};

export function SlotCard({
  slot,
  past,
  busy,
  onBook,
  onCancel,
}: {
  slot: Slot;
  past: boolean;
  busy: boolean;
  onBook: () => void;
  onCancel: () => void;
}) {
  const full = !slot.mine && slot.booked >= slot.maxAthletes;
  const left = slot.maxAthletes - slot.booked;

  return (
    <div
      className={clsx(
        "rounded-xl border p-3 transition-colors",
        past && "border-line bg-transparent opacity-45",
        !past && slot.mine && "border-lane/40 bg-lane/8",
        !past && full && "border-line bg-white",
        !past && !slot.mine && !full && "border-line bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold tabular-nums">
          {fmtRange(slot.start, slot.end)}
        </span>
        {slot.ruleLabel && (
          <span className="truncate rounded-full bg-line/60 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {slot.ruleLabel}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={clsx(
            "text-xs font-medium tabular-nums",
            past ? "text-ink-soft" : slot.mine ? "text-lane" : full ? "text-target" : "text-ink-soft"
          )}
        >
          {past
            ? "Passato"
            : slot.mine
              ? "Prenotato per te"
              : full
                ? `Pieno (${slot.maxAthletes}/${slot.maxAthletes})`
                : left <= 2
                  ? `Pochi posti: ${left}/${slot.maxAthletes}`
                  : `${left}/${slot.maxAthletes} posti`}
        </span>

        {!past && (slot.mine ? (
          <button
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-target hover:text-target disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Annulla
          </button>
        ) : (
          <button
            onClick={onBook}
            disabled={busy || full}
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              full
                ? "cursor-not-allowed bg-line/50 text-ink-soft"
                : "bg-ink text-paper hover:bg-target"
            )}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : full ? null : <Check className="h-3 w-3" />}
            {full ? "Completo" : "Prenota"}
          </button>
        ))}
      </div>
    </div>
  );
}
