"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { clsx } from "clsx";

type Kind = "ok" | "err";
type Toast = { id: number; text: string; kind: Kind };

const ToastCtx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((text: string, kind: Kind = "ok") => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "pointer-events-auto max-w-md rounded-full px-4 py-2 text-sm font-medium shadow-card",
              t.kind === "ok" ? "bg-lane text-white" : "bg-target text-white"
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
