"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Trash2, Users } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { fmtDayLong, fmtRange, fmtTime, today } from "@/lib/format";
import { Field } from "@/components/auth-card";

type Athlete = { name: string; email: string; role: "ADMIN" | "ATLETA" };
type AdminSlot = {
  id: string;
  day: string;
  start: string;
  end: string;
  maxAthletes: number;
  booked: number;
  mine: boolean;
  ruleLabel?: string | null;
  athletes?: Athlete[];
};

type SlotFormState = {
  date: string;
  startTime: string;
  endTime: string;
  maxAthletes: string;
};

const emptyForm = (): SlotFormState => ({
  date: today(),
  startTime: "18:00",
  endTime: "20:00",
  maxAthletes: "8",
});

export function SlotsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const toast = useToast();
  const [slots, setSlots] = useState<AdminSlot[] | null>(null);
  const [form, setForm] = useState<SlotFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ slots: AdminSlot[] }>("/api/slots?athletes=true");
      setSlots(res.slots);
    } catch (e) {
      toast(errMsg(e), "err");
    }
  }, [toast]);

  // refreshKey: il pannello admin incrementa il contatore dopo ogni azione
  // per aggiornare l'elenco senza rimontare il componente (stato UI conservato)
  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  async function saveCreate() {
    if (!form) return;
    setBusyId("new");
    try {
      await api("/api/slots", {
        method: "POST",
        body: { ...form, maxAthletes: Number(form.maxAthletes) },
      });
      toast("Turno creato.");
      setForm(null);
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string) {
    if (!form) return;
    setBusyId(id);
    try {
      await api(`/api/slots/${id}`, {
        method: "PATCH",
        body: { ...form, maxAthletes: Number(form.maxAthletes) },
      });
      toast("Turno aggiornato.");
      setForm(null);
      setEditingId(null);
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    const slot = slots?.find((s) => s.id === id);
    const who = slot && slot.booked > 0 ? ` Nota: ${slot.booked} prenotazione${slot.booked > 1 ? "i" : ""} verrà${slot.booked > 1 ? "anno" : ""} rimossa.` : "";
    if (!confirm(`Eliminare questo turno?${who}`)) return;
    setBusyId(id);
    try {
      const res = await api<{ ok: boolean; canceled: number }>(`/api/slots/${id}`, { method: "DELETE" });
      toast(`Turno eliminato${res.canceled ? ` · ${res.canceled} prenotazione rimossa` : ""}.`);
      await refresh();
    } catch (e) {
      toast(errMsg(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  const days = slots ? [...new Set(slots.map((s) => s.day))].sort() : [];

  return (
    <div className="space-y-6">
      {/* Crea */}
      {form && editingId === null ? (
        <FormCard
          title="Nuovo turno"
          form={form}
          setForm={setForm}
          onCancel={() => setForm(null)}
          onSave={saveCreate}
          busy={busyId === "new"}
          saveLabel="Crea turno"
        />
      ) : (
        <button
          onClick={() => setForm(emptyForm())}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-target"
        >
          + Nuovo turno
        </button>
      )}

      {form && editingId !== null ? (
        <FormCard
          title={`Modifica turno (${editingId.slice(0, 8)})`}
          form={form}
          setForm={setForm}
          onCancel={() => {
            setForm(null);
            setEditingId(null);
          }}
          onSave={() => saveEdit(editingId)}
          busy={busyId === editingId}
          saveLabel="Salva"
        />
      ) : null}

      {/* Elenco */}
      {!slots ? (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico i turni…
        </div>
      ) : slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          Nessun turno nei prossimi 30 giorni.
        </p>
      ) : (
        days.map((day) => (
          <section key={day}>
            <h3 className="mb-2 font-display text-sm font-semibold text-ink-soft">{fmtDayLong(day)}</h3>
            <ul className="space-y-2">
              {slots
                .filter((s) => s.day === day)
                .map((s) => (
                  <li key={s.id} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-display text-sm font-semibold tabular-nums">
                        {fmtRange(s.start, s.end)}
                      </span>
                      {s.ruleLabel && (
                        <span className="rounded-full bg-line/60 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                          {s.ruleLabel}
                        </span>
                      )}
                      <span
                        className={clsx(
                          "text-xs font-semibold tabular-nums",
                          s.booked >= s.maxAthletes ? "text-target" : "text-lane"
                        )}
                      >
                        {s.booked}/{s.maxAthletes}
                      </span>

                      <div className="ml-auto flex items-center gap-1">
                        <RowBtn
                          title="Atleti iscritti"
                          onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Atleti</span>
                        </RowBtn>
                        <RowBtn
                          title="Modifica"
                          onClick={() => {
                            setEditingId(s.id);
                            setForm({
                              date: s.day,
                              // orario nel fuso del club, non UTC (il `day`
                              // della riga è già locale)
                              startTime: fmtTime(s.start),
                              endTime: fmtTime(s.end),
                              maxAthletes: String(s.maxAthletes),
                            });
                            setExpanded(null);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </RowBtn>
                        <RowBtn
                          title="Elimina"
                          onClick={() => remove(s.id)}
                          disabled={busyId === s.id}
                          danger
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </RowBtn>
                      </div>
                    </div>

                    {expanded === s.id && (
                      <div className="mt-3 border-t border-line pt-3">
                        {s.athletes && s.athletes.length > 0 ? (
                          <ul className="grid gap-1 text-sm sm:grid-cols-2">
                            {s.athletes.map((a, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-target" aria-hidden />
                                <span className="truncate">{a.name}</span>
                                <span className="ml-auto truncate text-xs text-ink-soft">{a.email}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-ink-soft">Nessun iscritto.</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function FormCard({
  title,
  form,
  setForm,
  onCancel,
  onSave,
  busy,
  saveLabel,
}: {
  title: string;
  form: SlotFormState;
  setForm: (f: SlotFormState) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
  saveLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-target/30 bg-white p-4">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
        <Field label="Ora inizio" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required />
        <Field label="Ora fine" type="time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} required />
        <Field label="Posti max" type="number" value={form.maxAthletes} onChange={(v) => setForm({ ...form, maxAthletes: v })} min={1} max={100} required />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-full bg-target px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-target-deep disabled:opacity-60"
        >
          {busy ? "Salvataggio…" : saveLabel}
        </button>
        <button onClick={onCancel} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft">
          Annulla
        </button>
      </div>
    </div>
  );
}

function RowBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={clsx(
        "rounded-full border border-line p-2 transition-colors disabled:opacity-40",
        danger ? "text-target hover:bg-target/10" : "text-ink-soft hover:bg-line/50"
      )}
    >
      {children}
    </button>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Errore imprevisto.";
}
