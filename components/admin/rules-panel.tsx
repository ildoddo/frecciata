"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Repeat, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { fmtDayShort, today, WEEKDAY_SHORT } from "@/lib/format";
import { Field } from "@/components/auth-card";

type Rule = {
  id: string;
  label: string | null;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startsOn: string;
  endsOn: string;
  maxAthletes: number;
  slots: number;
};

type RuleForm = {
  label: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startsOn: string;
  endsOn: string;
  maxAthletes: string;
};

const emptyForm = (): RuleForm => ({
  label: "",
  daysOfWeek: [1, 4], // lun e gio, come da esempio del brief
  startTime: "18:00",
  endTime: "20:00",
  startsOn: today(),
  endsOn: today(),
  maxAthletes: "8",
});

const DAY_LABELS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

export function RulesPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const toast = useToast();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ rules: Rule[] }>("/api/rules");
      setRules(res.rules);
    } catch (e) {
      toast(errMsg(e), "err");
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  async function save() {
    if (!form) return;
    const id = editingId ?? "new";
    setBusyId(id);
    try {
      const body = { ...form, maxAthletes: Number(form.maxAthletes) };
      if (editingId) {
        await api(`/api/rules/${editingId}`, { method: "PATCH", body });
        toast("Regola aggiornata.");
      } else {
        await api("/api/rules", { method: "POST", body });
        toast("Regola creata: i turni sono stati generati nel calendario.");
      }
      setForm(null);
      setEditingId(null);
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, r: Rule) {
    const msg =
      r.slots > 0
        ? `Eliminare la regola e i suoi ${r.slots} turni? Le prenotazioni su quei turni verranno rimosse.`
        : "Eliminare la regola?";
    if (!confirm(msg)) return;
    setBusyId(id);
    try {
      await api(`/api/rules/${id}`, { method: "DELETE" });
      toast("Regola eliminata.");
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  const daysLabel = (days: number[]) =>
    [...new Set(days)].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join("+");

  return (
    <div className="space-y-6">
      {form ? (
        <div className="rounded-2xl border border-target/30 bg-white p-4">
          <h3 className="mb-3 font-display text-sm font-semibold">
            {editingId ? "Modifica regola" : "Nuova regola ricorrente"}
          </h3>

          <p className="mb-2 text-sm font-medium text-ink-soft">Giorni della settimana</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    daysOfWeek: form.daysOfWeek.includes(i)
                      ? form.daysOfWeek.filter((d) => d !== i)
                      : [...form.daysOfWeek, i],
                  })
                }
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  form.daysOfWeek.includes(i)
                    ? "border-target bg-target text-white"
                    : "border-line text-ink-soft hover:border-target/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Etichetta (facoltativa)" value={form.label} onChange={(v) => setForm({ ...form, label: v })} placeholder="Es. Allenamento senior" />
            <Field label="Ora inizio" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required />
            <Field label="Ora fine" type="time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} required />
            <Field label="Dal" type="date" value={form.startsOn} onChange={(v) => setForm({ ...form, startsOn: v })} required />
            <Field label="Al" type="date" value={form.endsOn} onChange={(v) => setForm({ ...form, endsOn: v })} required />
            <Field label="Posti max" type="number" value={form.maxAthletes} onChange={(v) => setForm({ ...form, maxAthletes: v })} min={1} max={100} required />
          </div>

          {form.endsOn < form.startsOn && (
            <p className="mt-2 text-xs font-medium text-target">La data di fine precede l'inizio.</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={busyId !== null}
              className="rounded-full bg-target px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-target-deep disabled:opacity-60"
            >
              {busyId ? "Salvataggio…" : editingId ? "Salva e rigenera" : "Crea e genera turni"}
            </button>
            <button
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft"
            >
              Annulla
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            {editingId
              ? "Se cambi giorni, orari o date, i turni vengono rigenerati e le prenotazioni esistenti su di essi rimosse. Cambiando solo la capienza, le prenotazioni restano."
              : "Verranno creati tutti i turni dei giorni selezionati tra le date indicate."}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setForm(emptyForm())}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-target"
        >
          <Repeat className="h-4 w-4" /> Nuova regola ricorrente
        </button>
      )}

      {!rules ? (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico le regole…
        </div>
      ) : rules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          Nessuna regola ricorrente.
        </p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white p-3">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold">
                  {r.label || daysLabel(r.daysOfWeek)}
                  <span className="ml-2 font-sans text-xs font-normal text-ink-soft">
                    {daysLabel(r.daysOfWeek)} · {r.startTime}–{r.endTime}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {fmtDayShort(r.startsOn)} → {fmtDayShort(r.endsOn)} · {r.maxAthletes} posti · {r.slots} turni generati
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  title="Modifica"
                  onClick={() => {
                    setEditingId(r.id);
                    setForm({
                      label: r.label ?? "",
                      daysOfWeek: r.daysOfWeek,
                      startTime: r.startTime,
                      endTime: r.endTime,
                      startsOn: r.startsOn,
                      endsOn: r.endsOn,
                      maxAthletes: String(r.maxAthletes),
                    });
                  }}
                  className="rounded-full border border-line p-2 text-ink-soft transition-colors hover:bg-line/50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Elimina"
                  disabled={busyId === r.id}
                  onClick={() => remove(r.id, r)}
                  className="rounded-full border border-line p-2 text-target transition-colors hover:bg-target/10 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Errore imprevisto.";
}
