"use client";

import { useEffect, useState } from "react";
import { fetchFileDiff, fetchFileSchema, fetchGhRepos, writeFile } from "@/lib/apiClient";
import { DiffView } from "@/components/DiffView";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RunStep } from "@/components/steps/RunStep";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import type { DiffResult } from "@/types";

type Row = { name: string; visibility: string; selected: boolean; tier: "core" | "worker" };

export function ReposStep({ onWritten }: { onWritten: () => void }) {
  const [org, setOrg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [written, setWritten] = useState(false);
  const [scope, setScope] = useState<"--all" | "--core-only">("--core-only");

  useEffect(() => {
    fetchFileSchema("repos-json").then((res) => {
      const current = res.currentValues as { github?: { org?: string } };
      if (current?.github?.org && current.github.org !== "<your-github-org>") {
        setOrg(current.github.org);
        setWritten(true);
      }
    });
  }, []);

  async function loadRepos() {
    if (!org.trim()) {
      setGhError("Enter a GitHub org first.");
      toast.error("Enter a GitHub org first.");
      return;
    }
    setGhError(null);
    setLoadingRepos(true);
    const res = await fetchGhRepos(org);
    setLoadingRepos(false);
    if (res.error || !res.repos) {
      setGhError(res.error ?? "Could not load repos");
      toast.error("Could not load repos via gh");
      return;
    }
    setRows(res.repos.map((r) => ({ name: r.name, visibility: r.visibility, selected: false, tier: "core" })));
    toast.success(`Loaded ${res.repos.length} repos from ${org}`);
  }

  function toggle(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const selectedCount = rows.filter((r) => r.selected).length;

  function buildValues() {
    const selected = rows.filter((r) => r.selected);
    return {
      github: { org, protocol: "ssh" as const },
      repos: selected.map((r) => ({ name: r.name, tier: r.tier })),
    };
  }

  async function preview() {
    const res = await fetchFileDiff("repos-json", buildValues());
    setDiffs(res.diffs);
  }

  async function commit() {
    const diff = diffs?.[0];
    const res = await writeFile("repos-json", buildValues(), diff ? { "config/repos.json": diff.currentHash } : {}, false, "repos-config");
    setConfirmOpen(false);
    if (res.ok) {
      setWritten(true);
      setDiffs(null);
      toast.success("config/repos.json updated");
      onWritten();
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel-flat p-4 space-y-3 anim-fade-in-up">
        <label className="block text-sm font-medium">GitHub org</label>
        <div className="flex gap-2">
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadRepos()}
            placeholder="your-github-org"
            className="field-input flex-1"
          />
          <Button
            variant="secondary"
            onClick={loadRepos}
            loading={loadingRepos}
            disabled={!org.trim()}
            icon={<span>🐙</span>}
          >
            Load via gh
          </Button>
        </div>
        {ghError && <p className="text-sm text-[var(--danger)]">{ghError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="panel-flat p-4 anim-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              {rows.length} repos found · <span style={{ color: "var(--accent-strong)" }}>{selectedCount} selected</span>
            </p>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div
                key={r.name}
                className="panel-flat p-2.5 flex items-center gap-2 flex-wrap"
                style={r.selected ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
              >
                <input type="checkbox" checked={r.selected} onChange={(e) => toggle(i, { selected: e.target.checked })} />
                <span className="mono text-sm flex-1 min-w-[10rem]">{r.name}</span>
                {r.selected && (
                  <div className="flex rounded-lg overflow-hidden border border-[var(--border)] text-xs">
                    {(["core", "worker"] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => toggle(i, { tier })}
                        className="px-2.5 py-1"
                        style={{
                          background: r.tier === tier ? "var(--accent)" : "transparent",
                          color: r.tier === tier ? "white" : "var(--muted)",
                        }}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" onClick={preview} disabled={selectedCount === 0}>
              Preview config/repos.json
            </Button>
            {diffs && (
              <Button variant="primary" onClick={() => setConfirmOpen(true)}>
                Write config/repos.json
              </Button>
            )}
          </div>
        </div>
      )}

      {diffs?.map((d, i) => <DiffView key={i} diff={d} />)}

      <ConfirmDialog
        open={confirmOpen}
        title="Write config/repos.json"
        body="This is the single source of truth for clone-repos.sh and pull-all.sh."
        confirmLabel="Write"
        onConfirm={commit}
        onCancel={() => setConfirmOpen(false)}
      />

      {written && (
        <div className="panel-flat p-4 space-y-3 anim-fade-in-up">
          <p className="text-sm font-medium">Clone the configured repos</p>
          <div className="flex gap-2 text-sm">
            {(
              [
                { key: "--core-only", label: "Core only" },
                { key: "--all", label: "Core + workers" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setScope(opt.key)}
                className="btn btn-sm"
                style={
                  scope === opt.key
                    ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-strong)" }
                    : { background: "var(--panel-hover)", borderColor: "var(--border)", color: "var(--muted)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <RunStep
            scriptKey="clone-repos"
            args={[scope]}
            stepId="clone-repos"
            label="Clone repos"
            successMessage="Repos cloned"
            confirmBody={`Runs scripts/clone-repos.sh ${scope} — clones every configured repo into codebase/ via git.`}
            onDone={onWritten}
          />
        </div>
      )}
    </div>
  );
}
