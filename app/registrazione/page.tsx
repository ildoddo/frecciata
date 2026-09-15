"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthCard, Field } from "@/components/auth-card";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/register", { method: "POST", body: { name, email, password } });
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) throw new Error("Registrazione avvenuta: effettua il login.");
      router.replace("/calendario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Registrati" subtitle="Crea il tuo account atleta in un minuto.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome e cognome" value={name} onChange={setName} placeholder="Mario Arco" required />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="nome@club.it" required />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="almeno 8 caratteri"
          required
          min={8}
        />
        {error && <p className="text-sm font-medium text-target">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-target px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-target-deep disabled:opacity-60"
        >
          {busy ? "Creazione…" : "Crea account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          Accedi
        </Link>
      </p>
    </AuthCard>
  );
}
