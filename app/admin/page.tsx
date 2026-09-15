"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { SlotsPanel } from "@/components/admin/slots-panel";
import { RulesPanel } from "@/components/admin/rules-panel";

type Tab = "turni" | "regole";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("turni");
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Pannello admin</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Turni, ricorrenze e posti per i prossimi 30 giorni.
          </p>
        </div>
        <div className="ml-auto flex rounded-full border border-line bg-white p-1">
          {(
            [
              ["turni", "Turni"],
              ["regole", "Regole"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "turni" ? <SlotsPanel refreshKey={tick} /> : <RulesPanel refreshKey={tick} />}
    </div>
  );
}
