"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast, type ToastMessage } from "@/lib/toast";

const STYLES: Record<ToastMessage["kind"], { border: string; icon: string }> = {
  success: { border: "var(--ok)", icon: "✓" },
  error: { border: "var(--danger)", icon: "✕" },
  info: { border: "var(--accent)", icon: "ℹ" },
};

// z-index scale for this app's overlays: toasts sit below dialogs (z-60 < ConfirmDialog's
// z-100) so a background toast never covers a modal you're actively responding to. Portalled to
// document.body for the same stacking-context reason as ConfirmDialog — see globals.css.
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return toast.subscribe((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    });
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const s = STYLES[t.kind];
        return (
          <div
            key={t.id}
            className="anim-fade-in-up panel-flat px-3 py-2.5 flex items-start gap-2 text-sm shadow-lg"
            style={{ borderLeft: `3px solid ${s.border}` }}
          >
            <span style={{ color: s.border }}>{s.icon}</span>
            <span className="text-[var(--text)]">{t.text}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
