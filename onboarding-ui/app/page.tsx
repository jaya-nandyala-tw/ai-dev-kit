"use client";

import { useState } from "react";
import Link from "next/link";
import { WizardShell } from "@/components/WizardShell";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { restartOnboarding } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { getVisibleSteps } from "@/lib/stepDefs";
import type { StepStatus, StepStatusEntry } from "@/types";

// The one page in this app that reads like a landing page — What/Why/Who, then the full
// journey mapped out, then a closing call to action — before handing off to the dense,
// functional step-by-step flow everywhere else. See the design-system note in globals.css for
// why the two coexist: this is the "front door," not the working surface.
export default function HomePage() {
  return (
    <WizardShell>
      {({ profile, statuses }) => {
        const visible = getVisibleSteps(profile as unknown as Record<string, boolean> | null);
        const required = visible.filter((s) => s.group === "required");
        const optional = visible.filter((s) => s.group === "optional");
        const doneCount = required.filter((s) => statuses[s.id]?.status === "done").length;
        const nextStep = visible.find((s) => statuses[s.id]?.status !== "done" && statuses[s.id]?.status !== "locked");
        const allRequiredDone = profile && required.every((s) => statuses[s.id]?.status === "done");

        return (
          <div className="anim-fade-in-up">
            <Hero profile={profile} nextStep={nextStep} doneCount={doneCount} required={required.length} />
            <WhatWhyWho />
            <StoryWorkflow />
            <Roadmap required={required} optional={optional} statuses={statuses} />
            <ClosingCta profile={profile} nextStep={nextStep} allRequiredDone={Boolean(allRequiredDone)} />
          </div>
        );
      }}
    </WizardShell>
  );
}

function Hero({
  profile,
  nextStep,
  doneCount,
  required,
}: {
  profile: unknown;
  nextStep: ReturnType<typeof getVisibleSteps>[number] | undefined;
  doneCount: number;
  required: number;
}) {
  const [restartOpen, setRestartOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);

  async function restart() {
    setRestarting(true);
    await restartOnboarding();
    toast.success("Onboarding restarted — your files are untouched.");
    window.location.reload();
  }

  return (
    <section className="panel p-6 sm:p-10 lg:p-14 relative overflow-hidden">
      {/* Decorative oversized numeral behind the headline — "layered type for depth," the
          design system's own alternative to shadows/glows. Hidden on mobile so it never forces
          horizontal scroll on a narrow viewport. */}
      <span
        aria-hidden
        className="hidden lg:block absolute -top-8 right-4 mono font-bold pointer-events-none select-none"
        style={{ fontSize: "12rem", lineHeight: 1, color: "var(--border)", opacity: 0.5 }}
      >
        01
      </span>

      <div className="relative max-w-3xl">
        <p className="label-micro mb-3">Guided Setup</p>
        <p className="font-serif italic text-lg text-[var(--muted)] mb-2">No copy-pasting placeholders.</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-none mb-5">
          Configure your
          <br />
          AI <span style={{ color: "var(--accent)" }}>harness.</span>
        </h1>
        <p className="text-base md:text-lg text-[var(--muted)] max-w-xl mb-8">
          This wizard reads and writes the real files in this repo, and runs the real setup
          scripts — nothing here is simulated.
        </p>

        <div className="h-1 w-16 mb-6" style={{ background: "var(--accent)" }} />

        {!profile ? (
          <Link href="/steps/stack-profile">
            <Button variant="primary">Start the guided setup →</Button>
          </Link>
        ) : nextStep ? (
          <div className="max-w-sm">
            <div className="flex justify-between mono text-xs text-[var(--muted)] mb-2">
              <span className="tracking-wide">Required steps</span>
              <span>
                {doneCount}/{required}
              </span>
            </div>
            <ProgressBar value={required ? (doneCount / required) * 100 : 0} className="mb-5" />
            <Link href={`/steps/${nextStep.id}`}>
              <Button variant="primary">Continue: {nextStep.title} →</Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ok)" }}>
            <span className="anim-pop">✓</span>
            <span>All required steps are done.</span>
          </div>
        )}

        {Boolean(profile) && (
          <button
            onClick={() => setRestartOpen(true)}
            className="mono text-xs tracking-wide text-[var(--muted-soft)] hover:text-[var(--text)] transition-colors mt-6 flex items-center gap-1.5"
          >
            <span>↺</span>
            <span>Restart onboarding</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={restartOpen}
        title="Restart onboarding?"
        body={
          <>
            This clears your stack-profile answers and this tool's own progress/run history. It
            does <strong>not</strong> touch any file you've already written — CODEOWNERS,
            config/repos.json, .env, etc. all keep their content, and steps based on real file
            state will still show as done.
          </>
        }
        confirmLabel={restarting ? "Restarting…" : "Restart"}
        onConfirm={restart}
        onCancel={() => setRestartOpen(false)}
      />
    </section>
  );
}

const ANSWERS = [
  {
    n: "What",
    title: "An AI harness accelerator — not another SaaS boilerplate.",
    body: "Agents, skills, guardrails, and the story lifecycle your team needs for AI-first software delivery: 9 agents, 9 skills, 3 prompts, 1 commit/PR review gate. No product-specific paths or business logic to rip out before it's actually yours.",
  },
  {
    n: "Why",
    title: "Context is the difference between an agent that helps and one you have to babysit.",
    body: null,
    compare: {
      without: "An agent sees only the open file. It guesses at your patterns, puts code in the wrong directory, misses how a change ripples across repos.",
      with: "The agent loads scoped context per file path. It follows your conventions, respects placement rules, and catches its own mistakes before a human opens the PR.",
    },
  },
  {
    n: "Who",
    title: "For whoever's in front of this screen right now.",
    body: "Setting this kit up for your team for the first time, or a new teammate running through it on day one — same guided path either way. Answer a few questions, and everything below skips what doesn't apply to you.",
  },
];

function WhatWhyWho() {
  return (
    <section className="py-14 lg:py-20 border-t border-[var(--border-soft)]">
      <div className="space-y-12 lg:space-y-16">
        {ANSWERS.map((a) => (
          <div key={a.n} className="grid lg:grid-cols-12 gap-4 lg:gap-8">
            <div className="lg:col-span-3">
              <p className="font-serif italic text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-none" style={{ color: "var(--accent)" }}>
                {a.n}
              </p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-3 max-w-7xl">
                {a.title}
              </h2>
              {a.body && <p className="text-base text-[var(--muted)] max-w-7xl">{a.body}</p>}
              {a.compare && (
                <div className="grid sm:grid-cols-2 gap-4 mt-4 max-w-3xl">
                  <div className="border-t-2 pt-3" style={{ borderColor: "var(--border)" }}>
                    <p className="label-micro mb-2">Without a harness</p>
                    <p className="text-sm text-[var(--muted)]">{a.compare.without}</p>
                  </div>
                  <div className="border-t-2 pt-3" style={{ borderColor: "var(--accent)" }}>
                    <p className="label-micro mb-2" style={{ color: "var(--accent)" }}>
                      With this harness
                    </p>
                    <p className="text-sm text-[var(--text)]">{a.compare.with}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoryWorkflow() {
  return (
    <section className="py-14 lg:py-20 border-t border-[var(--border-soft)]">
      <p className="label-micro mb-2">Under the hood</p>
      <h2 className="text-5xl sm:text-3xl font-bold tracking-tight mb-3 max-w-5xl">
        How a story actually moves through the harness.
      </h2>
      <p className="text-base text-[var(--muted)] max-w-7xl mb-8">
        Once this kit is set up, this is the loop every ticket runs through — each stage handed
        to the agent that owns it, with a human gate before work starts and before it ships.
      </p>
      <div className="panel p-5 sm:p-6 overflow-x-auto">
        <WorkflowDiagram />
      </div>
      <p className="text-sm text-[var(--muted)] mt-3 max-w-7xl">
        A failed <code className="mono text-xs">@verify</code> pass or an unresolved review
        blocker routes back into the implement loop by name — never re-run as duplicated logic.
      </p>
    </section>
  );
}

function Roadmap({
  required,
  optional,
  statuses,
}: {
  required: ReturnType<typeof getVisibleSteps>;
  optional: ReturnType<typeof getVisibleSteps>;
  statuses: Record<string, StepStatusEntry>;
}) {
  return (
    <section id="roadmap" className="py-14 lg:py-20 border-t border-[var(--border-soft)] scroll-mt-6">
      <p className="label-micro mb-2">The path ahead</p>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 max-w-7xl">
        Every step, mapped out before you start.
      </h2>

      <ol className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {required.map((s, i) => (
          <RoadmapRow key={s.id} index={i + 1} step={s} status={statuses[s.id]?.status ?? "not-started"} />
        ))}
      </ol>

      {optional.length > 0 && (
        <>
          <p className="label-micro mt-10 mb-2">Optional, if it applies to you</p>
          <ol className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
            {optional.map((s, i) => (
              <RoadmapRow key={s.id} index={i + 1} step={s} status={statuses[s.id]?.status ?? "not-started"} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function RoadmapRow({
  index,
  step,
  status,
}: {
  index: number;
  step: ReturnType<typeof getVisibleSteps>[number];
  status: StepStatus;
}) {
  const locked = status === "locked";
  return (
    <li>
      <Link
        href={locked ? "#" : `/steps/${step.id}`}
        aria-disabled={locked}
        className={`card-interactive flex items-center gap-4 sm:gap-6 py-4 px-1 ${locked ? "opacity-50 pointer-events-none" : ""}`}
      >
        <span className="mono text-sm text-[var(--muted-soft)] w-6 shrink-0">{String(index).padStart(2, "0")}</span>
        <span className="text-lg shrink-0 hidden sm:inline">{step.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-base font-semibold block truncate">{step.title}</span>
          <span className="text-sm text-[var(--muted)] block truncate">{step.description}</span>
        </span>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}

function ClosingCta({
  profile,
  nextStep,
  allRequiredDone,
}: {
  profile: unknown;
  nextStep: ReturnType<typeof getVisibleSteps>[number] | undefined;
  allRequiredDone: boolean;
}) {
  // Inverted band — the design system's specified "final CTA" treatment: background and
  // foreground swap, a deliberate full stop after an otherwise dark page.
  return (
    <section className="border-t border-[var(--border-soft)] p-8 sm:p-12 lg:p-16" style={{ background: "var(--text)", color: "var(--bg)" }}>
      <div className="max-w-7xl">
        <p className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
          {allRequiredDone ? "Nearly there" : "Ready when you are"}
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none mb-5">
          {allRequiredDone ? "Trim what you don't need." : "Nothing here happens without you clicking it."}
        </h2>
        <p className="text-base opacity-70 mb-8 max-w-lg">
          {allRequiredDone
            ? "Every remaining agent, skill, and script gets checked against your stack answers — remove what doesn't apply, keep everything you use."
            : "Every write shows a diff first. Every script run shows the exact command first. You're always one explicit click from the next real change."}
        </p>
        {allRequiredDone ? (
          <Link href="/recommendations">
            <Button variant="secondary" className="btn-on-light">
              Review recommended resources →
            </Button>
          </Link>
        ) : !profile ? (
          <Link href="/steps/stack-profile">
            <Button variant="secondary" className="btn-on-light">
              Start the guided setup →
            </Button>
          </Link>
        ) : nextStep ? (
          <Link href={`/steps/${nextStep.id}`}>
            <Button variant="secondary" className="btn-on-light">
              Continue: {nextStep.title} →
            </Button>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
