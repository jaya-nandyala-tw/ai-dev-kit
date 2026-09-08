"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Portalled to document.body for the same stacking-context reason as ConfirmDialog (see the
// "Motion" note in globals.css) — a drawer nested inside any animated/sticky ancestor could
// otherwise render behind unrelated page content.
//
// z-index scale for this app's overlays (documented once, here, since it now spans three
// components): toasts z-60 (transient, lowest disruption) < this drawer z-90 (reference info,
// dismissible any time) < ConfirmDialog z-100 (blocking, requires a response). A help drawer
// never needs to out-rank a confirm dialog.
export function HelpDrawer({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: "blur(2px)" }} />
      <div
        className="relative panel h-full w-full max-w-lg overflow-y-auto anim-slide-in-right"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-soft)] bg-[var(--panel)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="btn btn-ghost btn-sm shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5 space-y-5 text-sm leading-relaxed">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Small docsite-flavored building blocks so per-step help content reads consistently. */
export function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[var(--muted-soft)] mb-2">{title}</h3>
      <div className="text-[var(--text)]">{children}</div>
    </section>
  );
}

export function HelpList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 list-disc pl-5 marker:text-[var(--muted-soft)]">
      {items.map((item, i) => (
        <li key={i} className="text-[var(--muted)]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function HelpExample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-flat p-3 mt-2">
      <p className="text-xs text-[var(--accent-strong)] font-medium mb-1.5">{label}</p>
      <div className="mono text-xs text-[var(--muted)] whitespace-pre-wrap">{children}</div>
    </div>
  );
}
