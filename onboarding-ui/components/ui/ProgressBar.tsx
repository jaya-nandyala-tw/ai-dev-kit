// A sharp, thin accent bar — not a pill. This doubles as the design system's own "accent bars:
// thin horizontal accent-colored bars as visual anchors" signature, not just a progress meter.
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full bg-black/40 overflow-hidden ${className}`}>
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: "var(--accent)" }}
      />
    </div>
  );
}
