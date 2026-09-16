"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ATLETA";
  active: boolean;
  createdAt: string;
  bookingsCount: number;
};

export default function UtentiPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Errore nel caricamento utenti");
      const data = await res.json();
      setUsers(data.users);
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nell'aggiornamento");
      }

      toast(
        currentActive ? "Utente disabilitato" : "Utente abilitato",
        "ok"
      );
      fetchUsers();
    } catch (err: any) {
      toast(err.message, "err");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-ink-soft">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Gestione utenti</h1>
        <p className="text-sm text-ink-soft mt-1">
          {users.length} {users.length === 1 ? "utente" : "utenti"} registrati
        </p>
      </div>

      <div className="border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Nome</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">Ruolo</th>
                <th className="text-left py-3 px-4 font-medium">Prenotazioni</th>
                <th className="text-left py-3 px-4 font-medium">Data reg.</th>
                <th className="text-left py-3 px-4 font-medium">Stato</th>
                <th className="text-left py-3 px-4 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-paper-soft/50">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4 text-ink-soft">{user.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        user.role === "ADMIN"
                          ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-target/10 text-target-deep"
                          : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-lane/10 text-lane-deep"
                      }
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">{user.bookingsCount}</td>
                  <td className="py-3 px-4 text-ink-soft">
                    {new Date(user.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        user.active
                          ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                          : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
                      }
                    >
                      {user.active ? "Attivo" : "Disabilitato"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => toggleActive(user.id, user.active)}
                        className="text-sm text-target hover:text-target-deep font-medium"
                      >
                        {user.active ? "Disabilita" : "Abilita"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-ink-soft space-y-1">
        <p>
          <strong>Nota:</strong> Disabilitare un utente impedisce l'accesso all'app, ma
          mantiene le sue prenotazioni.
        </p>
        <p>Utile per gestire atleti che non hanno pagato la quota di iscrizione.</p>
      </div>
    </div>
  );
}
