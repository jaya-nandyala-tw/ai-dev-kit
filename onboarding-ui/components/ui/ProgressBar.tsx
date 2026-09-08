export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full rounded-full bg-black/30 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-strong))" }}
      />
    </div>
  );
}
