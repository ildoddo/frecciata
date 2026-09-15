"use client";

import { Target } from "lucide-react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] items-center justify-center py-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-target" aria-hidden />
          <span className="font-display text-xl font-semibold tracking-tight">Frecciata</span>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h1 className="font-display text-lg font-semibold">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-ink-soft">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export type FieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  inputMode?: "numeric" | "text" | "decimal";
  as?: "input" | "select";
  options?: { value: string; label: string }[];
};

export function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
  inputMode,
  as = "input",
  options,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {as === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-target focus:ring-2 focus:ring-target/25"
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          inputMode={inputMode}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-target focus:ring-2 focus:ring-target/25"
        />
      )}
    </label>
  );
}
