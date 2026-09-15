"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Target, LogOut } from "lucide-react";
import { clsx } from "clsx";

export function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.user.role === "ADMIN";

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={clsx(
        "rounded-full px-3 py-1.5 text-sm transition-colors",
        pathname === href || pathname.startsWith(href + "/")
          ? "bg-ink text-paper"
          : "text-ink-soft hover:bg-line/60 hover:text-ink"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Frecciata — home">
          <Target className="h-5 w-5 text-target" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight">Frecciata</span>
        </Link>

        <nav className="ml-auto flex min-w-0 items-center gap-1">
          {status === "unauthenticated" ? (
            <Link
              href="/login"
              className="rounded-full bg-target px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-target-deep"
            >
              Accedi
            </Link>
          ) : (
            <>
              {link("/calendario", "Calendario")}
              {link("/prenotazioni", "Prenotazioni")}
              {isAdmin && link("/admin", "Pannello")}
              <span className="mx-1 hidden h-4 w-px shrink-0 bg-line sm:block" aria-hidden />
              <span className="hidden max-w-32 truncate text-sm text-ink-soft sm:block">
                {session?.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" }).then(() => router.refresh())}
                className="rounded-full p-2 text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
                aria-label="Esci"
                title="Esci"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
