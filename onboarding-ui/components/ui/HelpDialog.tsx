"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Portalled to document.body for the same stacking-context reason as ConfirmDialog (see the
// "Motion" note in globals.css) — a dialog nested inside any animated/sticky ancestor could
// otherwise render behind unrelated page content.
//
// z-index scale for this app's overlays: toasts z-60 (transient, lowest disruption) < this
// dialog z-90 (reference info, dismissible any time) < ConfirmDialog z-100 (blocking, requires
// a response). Help never needs to out-rank a confirm dialog.
const SIZE_CLASS = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function HelpDialog({
  open,
  onClose,
  title,
  icon,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  /** "lg" for content-dense dialogs (the global "How this works" FAB) that benefit from more
   * horizontal room; per-step help stays at the default "md". */
  size?: "md" | "lg";
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
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8 anim-fade-in"
      style={{ backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--bg) 65%, transparent)" }}
      onClick={onClose}
    >
      <div
        className={`relative panel w-full ${SIZE_CLASS[size]} max-h-[85vh] overflow-y-auto anim-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-6 py-5 border-b border-[var(--border-soft)] bg-[var(--panel)]">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
            {icon && <span className="text-2xl leading-none">{icon}</span>}
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close help" className="btn btn-ghost btn-sm shrink-0">
            ✕
          </button>
        </div>
        <div className="px-6 py-6 space-y-7">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Docsite-flavored reading blocks — a section is an accent-flagged heading over prose, not a
 * bullet dump, so a help dialog reads more like a short article than a tooltip. */
export function HelpSection({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <section className="border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
      <h3 className="label-micro mb-2.5 flex items-center gap-2" style={{ color: "var(--accent)" }}>
        {icon && <span className="text-sm leading-none">{icon}</span>}
        {title}
      </h3>
      <div className="text-[var(--text)]">{children}</div>
    </section>
  );
}

export function HelpList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--muted)]">
          <span className="mono shrink-0" style={{ color: "var(--muted-soft)" }}>
            →
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Same reading rhythm as HelpList, but each item carries its own icon instead of a generic
 * arrow — for lists where every item is a distinct, nameable guarantee (e.g. the "is this
 * safe" section) rather than an undifferentiated string of facts. */
export function HelpIconList({ items }: { items: { icon: string; text: React.ReactNode }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--muted)]">
          <span
            className="w-7 h-7 border flex items-center justify-center shrink-0 text-sm"
            style={{ borderColor: "var(--border-soft)", background: "var(--bg-elevated)" }}
          >
            {item.icon}
          </span>
          <span className="pt-1">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function HelpExample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--border-soft)] mt-3">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-soft)]" style={{ background: "var(--bg-elevated)" }}>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] opacity-50" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] opacity-50" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] opacity-50" />
        </span>
        <span className="mono text-xs" style={{ color: "var(--accent-strong)" }}>
          {label}
        </span>
      </div>
      <div className="mono text-xs text-[var(--muted)] whitespace-pre-wrap p-3">{children}</div>
    </div>
  );
}
