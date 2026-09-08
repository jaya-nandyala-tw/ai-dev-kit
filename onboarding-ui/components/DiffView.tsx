import type { DiffResult } from "@/types";

function DiffLine({ line }: { line: string }) {
  let color = "var(--text)";
  let bg = "transparent";
  if (line.startsWith("+") && !line.startsWith("+++")) {
    color = "var(--ok)";
    bg = "color-mix(in srgb, var(--ok) 8%, transparent)";
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    color = "var(--danger)";
    bg = "color-mix(in srgb, var(--danger) 8%, transparent)";
  } else if (line.startsWith("@@")) color = "var(--accent-strong)";
  else if (line.startsWith("---") || line.startsWith("+++")) color = "var(--muted-soft)";
  return (
    <div className="mono whitespace-pre px-2" style={{ color, background: bg }}>
      {line || " "}
    </div>
  );
}

export function DiffView({ diff }: { diff: DiffResult }) {
  const lines = diff.unifiedDiff.split("\n").filter((_, i) => i > 1 || diff.unifiedDiff.split("\n").length <= 2);
  const noChanges = lines.length === 0 || (lines.length === 1 && lines[0] === "");

  return (
    <div className="panel-flat overflow-hidden text-xs anim-fade-in-up">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
        <span className="mono text-xs tracking-wide text-[var(--muted-soft)] flex items-center gap-1.5">
          <span>📄</span>
          {diff.path.split("/").slice(-3).join("/")}
        </span>
        <div className="flex gap-1.5">
          {diff.customized && (
            <span className="badge" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
              already customized
            </span>
          )}
          {!diff.currentExists && (
            <span className="badge" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>
              new file
            </span>
          )}
        </div>
      </div>
      <div className="py-2 overflow-x-auto max-h-72">
        {noChanges ? (
          <div className="text-[var(--muted-soft)] px-2">No changes.</div>
        ) : (
          lines.map((l, i) => <DiffLine key={i} line={l} />)
        )}
      </div>
    </div>
  );
}
