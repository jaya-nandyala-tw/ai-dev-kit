export function LocalOnlyBanner() {
  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2 text-xs sm:text-sm border-b"
      style={{
        background: "linear-gradient(90deg, color-mix(in srgb, var(--warn) 12%, transparent), color-mix(in srgb, var(--warn) 6%, transparent))",
        borderColor: "var(--border)",
        color: "var(--warn)",
      }}
    >
      <p className="flex-1 opacity-90">
        <span className="mono tracking-wide">LOCAL ONLY</span>
        <span> — this wizard runs real scripts and writes real files on your machine. Never expose it beyond localhost.</span>
      </p>
    </div>
  );
}
