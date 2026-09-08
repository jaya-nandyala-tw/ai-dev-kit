"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WizardShell } from "@/components/WizardShell";
import { Button } from "@/components/ui/Button";
import { fetchRecommendations } from "@/lib/apiClient";
import { RunStep } from "@/components/steps/RunStep";
import type { RecommendationItem } from "@/types";

const VERDICT_META: Record<RecommendationItem["verdict"], { label: string; color: string; icon: string }> = {
  "not-needed": { label: "Not needed for your stack", color: "var(--warn)", icon: "🧹" },
  relevant: { label: "Relevant to you", color: "var(--ok)", icon: "✓" },
  always: { label: "Always included", color: "var(--muted)", icon: "•" },
};

export default function RecommendationsPage() {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [showAlways, setShowAlways] = useState(false);

  function refresh() {
    fetchRecommendations().then((res) => setItems(res.items));
  }

  useEffect(refresh, []);

  const notNeeded = items.filter((i) => i.verdict === "not-needed");
  const relevant = items.filter((i) => i.verdict === "relevant");
  const always = items.filter((i) => i.verdict === "always");
  const allNotNeededPaths = notNeeded.flatMap((i) => i.paths);

  return (
    <WizardShell>
      {({ profile }) => (
        <div className="max-w-4xl mx-auto space-y-5 anim-fade-in-up">
          <Link href="/">
            <Button variant="ghost" size="sm" icon={<span>←</span>}>
              Home
            </Button>
          </Link>

          <div className="panel-flat p-5">
            <h1 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
              <span>🧹</span> Recommended Resources
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {profile
                ? "Computed from your stack answers — not every agent/skill/script this kit ships is useful to every team."
                : "Answer the stack questionnaire first for real recommendations — everything shows as relevant until then."}
            </p>
          </div>

          {notNeeded.length > 0 && (
            <div className="panel p-4 anim-fade-in-up" style={{ borderColor: "var(--warn)" }}>
              <p className="text-sm mb-3">
                <strong>{notNeeded.length}</strong> resource{notNeeded.length === 1 ? "" : "s"} look unused for your
                stack. Removing runs <code className="mono text-xs">git rm -r</code> — reversible pre-commit via{" "}
                <code className="mono text-xs">git status</code>/<code className="mono text-xs">git checkout</code>.
              </p>
              <RunStep
                scriptKey="git-rm"
                args={allNotNeededPaths}
                stepId="recommendations-cleanup"
                label={`Remove all ${notNeeded.length} not-needed resources`}
                danger
                successMessage="Removed. Nothing is gone for good until you commit."
                confirmBody={
                  <div>
                    <p className="mb-2">This will run:</p>
                    <code className="mono text-xs block bg-black/30 p-2 rounded">
                      git rm -r {allNotNeededPaths.join(" ")}
                    </code>
                  </div>
                }
                onDone={refresh}
              />
            </div>
          )}

          <Section title="Not needed for your stack" items={notNeeded} onDone={refresh} />
          <Section title="Relevant to you" items={relevant} onDone={refresh} />

          {always.length > 0 && (
            <div className="panel-flat p-4">
              <button
                onClick={() => setShowAlways((v) => !v)}
                className="w-full flex items-center justify-between text-sm text-[var(--muted)]"
              >
                <span>Always included ({always.length}) — generic, stack-agnostic</span>
                <span className="transition-transform" style={{ transform: showAlways ? "rotate(180deg)" : "none" }}>
                  ⌄
                </span>
              </button>
              {showAlways && (
                <div className="mt-3 space-y-2 anim-fade-in-up">
                  {always.map((item) => (
                    <ResourceRow key={item.key} item={item} onDone={refresh} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </WizardShell>
  );
}

function Section({ title, items, onDone }: { title: string; items: RecommendationItem[]; onDone: () => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="label-micro mb-2 px-1">
        {title} ({items.length})
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <ResourceRow key={item.key} item={item} onDone={onDone} />
        ))}
      </div>
    </div>
  );
}

function ResourceRow({ item, onDone }: { item: RecommendationItem; onDone: () => void }) {
  const meta = VERDICT_META[item.verdict];
  return (
    <div className="panel-flat card-interactive p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 max-w-lg">
        <div className="mono text-sm whitespace-normal break-words">{item.paths.join(", ")}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5 whitespace-normal break-words">{item.why}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="badge" style={{ color: meta.color, borderColor: meta.color }}>
          {meta.icon} {meta.label}
        </span>
        {item.verdict === "not-needed" && item.removable && (
          <RunStep
            scriptKey="git-rm"
            args={item.paths}
            stepId="recommendations-cleanup"
            label="Remove"
            danger
            successMessage={`Removed ${item.paths.join(", ")}`}
            confirmBody={`Runs: git rm -r ${item.paths.join(" ")}`}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}
