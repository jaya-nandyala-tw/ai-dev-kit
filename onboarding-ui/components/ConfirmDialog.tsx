"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

// Portalled straight to document.body — deliberately, not just for defensiveness: several
// ancestors in this app (the sticky sidebar, anything wearing an .anim-fade-in-up/scale-in/pop
// class) establish their own CSS stacking context, which traps a `position: fixed` descendant
// inside that ancestor's paint order instead of letting it escape to the viewport root. A dialog
// nested inside one of those would render behind unrelated content elsewhere on the page. See
// the "Motion" note in globals.css for the animation half of that fix — this is the other half.
export function ConfirmDialog({
  open,
  title,
  body,
  requireCheckbox,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  requireCheckbox?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 anim-fade-in"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={onCancel}
    >
      <div className="panel w-full max-w-lg p-5 anim-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-3">
          <span
            className="w-8 h-8 border flex items-center justify-center shrink-0 text-sm"
            style={{
              background: danger ? "var(--danger-soft)" : "var(--accent-soft)",
              borderColor: danger ? "var(--danger)" : "var(--accent)",
              color: danger ? "var(--danger)" : "var(--accent-strong)",
            }}
          >
            {danger ? "⚠" : "👀"}
          </span>
          <h3 className="text-base font-bold tracking-tight pt-1">{title}</h3>
        </div>
        <div className="text-sm text-[var(--muted)] mb-4 pl-11">{body}</div>
        {requireCheckbox && (
          <label className="flex items-start gap-2 text-sm mb-4 pl-11 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
            <span>{requireCheckbox}</span>
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={Boolean(requireCheckbox) && !checked}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
