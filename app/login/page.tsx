"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthCard, Field } from "@/components/auth-card";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callbackUrl = params?.get("callbackUrl") || "/calendario";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Credenziali non valide. Controlla email e password.");
      return;
    }
    router.replace(callbackUrl);
  }

  return (
    <AuthCard title="Bentornato" subtitle="Accedi per prenotare i tuoi allenamenti.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="nome@club.it" required />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
        {error && <p className="text-sm font-medium text-target">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-target px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-target-deep disabled:opacity-60"
        >
          {busy ? "Accesso…" : "Accedi"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Non hai un account?{" "}
        <Link href="/registrazione" className="font-medium text-ink underline underline-offset-2">
          Registrati come atleta
        </Link>
      </p>
    </AuthCard>
  );
}
