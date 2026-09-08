export function LocalOnlyBanner() {
  return (
    <div
      className="w-full text-xs sm:text-sm px-4 py-2 text-center border-b"
      style={{
        background: "linear-gradient(90deg, rgba(234,181,77,0.12), rgba(234,181,77,0.06))",
        borderColor: "var(--border)",
        color: "var(--warn)",
      }}
    >
      <span className="opacity-90">🔒 Local only — this dashboard runs real scripts and writes real files on your machine. Never expose it beyond localhost.</span>
    </div>
  );
}
