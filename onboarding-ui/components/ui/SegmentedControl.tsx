"use client";

// A small sharp-edged toggle — replaces two near-identical hand-rolled versions that used to
// live in ReposStep.tsx (tier picker, clone-scope picker). One component, one place to keep the
// active/inactive styling consistent.
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex border border-[var(--border)]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`mono ${size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5"} transition-colors`}
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--bg)" : "var(--muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
