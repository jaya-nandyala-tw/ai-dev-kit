import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Condensed from harness-engineering.md's "Principles" section at the repo root — that file
// also carries Context Rot mitigations and a worked example this page deliberately leaves out,
// so it stays a quick, scannable reference rather than a duplicate of the full doc.
const PRINCIPLES = [
  {
    title: "Earn each rule",
    body: "Every instruction must trace to a past failure or hard constraint. Hand-craft rules — never auto-generate them; auto-generated agent files have been shown to hurt performance.",
  },
  {
    title: "Silent success, verbose failure",
    body: "Sensors produce zero output when things pass. On failure, they surface the exact error so the agent can self-correct.",
  },
  {
    title: "Reference, never duplicate",
    body: "Your top-level instructions file is a navigation index pointing to specs — not a content wall. Heavy context loads on demand.",
  },
  {
    title: "Sub-agents are context firewalls",
    body: "Use them for context isolation — a fresh window, a condensed answer handed back to the parent — not role-play personas.",
  },
  {
    title: "Codebase wins over guidelines",
    body: "When existing code contradicts a guideline, the agent follows the code. The codebase is the source of truth.",
  },
  {
    title: "Structure in, structure out",
    body: "Real file paths, symbol names, existing patterns to follow — the more constrained the input, the more predictable the output.",
  },
  {
    title: "Promote rules from docs into code",
    body: "When a documented rule keeps being violated, escalate it to a linter or structural test. Prose is the starting point; mechanical enforcement is the destination.",
  },
  {
    title: "Treat the harness as software",
    body: "Skills, prompts, instructions, and specs are versioned, reviewed in PRs, and refactored when they drift. A stale prompt rots like a stale test.",
  },
];

export default function PrinciplesPage() {
  return (
    <div className="max-w-5xl mx-auto anim-fade-in-up">
      <Link href="/">
        <Button variant="ghost" size="sm" icon={<span>←</span>}>
          Home
        </Button>
      </Link>

      <section className="mt-6 mb-12">
        <p className="label-micro mb-3">Why this exists</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4 max-w-4xl">
          The rules this harness is actually built on.
        </h1>
        <p className="text-base text-[var(--muted)] max-w-4xl">
          Every agent, skill, and guardrail in this kit traces back to one of these eight
          principles — not aspirational copy, the actual editorial bar new agents, skills, and
          instructions get held to before they ship.
        </p>
      </section>

      <ol className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {PRINCIPLES.map((p, i) => (
          <li key={p.title} className="flex gap-4 sm:gap-6 py-6">
            <span className="mono text-2xl sm:text-3xl font-bold shrink-0 w-10" style={{ color: "var(--border)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight mb-1.5">{p.title}</h2>
              <p className="text-sm text-[var(--muted)] max-w-4xl">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mono text-xs text-[var(--muted-soft)] mt-8">
        Full methodology, context-rot mitigations, and a worked example: harness-engineering.md at the repo root.
      </p>
    </div>
  );
}
