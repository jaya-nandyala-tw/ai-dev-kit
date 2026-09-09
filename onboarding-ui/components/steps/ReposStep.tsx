"use client";

import { useEffect, useState } from "react";
import { fetchFileDiff, fetchFileSchema, fetchGhRepos, writeFile } from "@/lib/apiClient";
import { DiffView } from "@/components/DiffView";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RunStep } from "@/components/steps/RunStep";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/lib/toast";
import type { DiffResult } from "@/types";

type Row = { name: string; visibility: string; selected: boolean; tier: "core" | "worker" };

// Three real phases (connect → select → clone), each a real git/network operation — numbered
// so the multi-stage nature of this step reads clearly instead of as one long stack of panels.
function PhaseLabel({ n, title }: { n: string; title: string }) {
  return (
    <p className="flex items-baseline gap-2 mb-3">
      <span className="mono text-sm font-semibold" style={{ color: "var(--accent)" }}>
        {n}
      </span>
      <span className="text-sm font-semibold">{title}</span>
    </p>
  );
}

export function ReposStep({ onWritten }: { onWritten: () => void }) {
  const [org, setOrg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [written, setWritten] = useState(false);
  const [scope, setScope] = useState<"--all" | "--core-only">("--core-only");
  const [repoFilter, setRepoFilter] = useState("");

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
    setRepoFilter("");
    toast.success(`Loaded ${res.repos.length} repos from ${org}`);
  }

  const filteredRows = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.name.toLowerCase().includes(repoFilter.trim().toLowerCase()));

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
      <div className="panel-flat p-4 anim-fade-in-up">
        <PhaseLabel n="01" title="Connect to GitHub" />
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
        {ghError && <p className="text-sm text-[var(--danger)] mt-2">{ghError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="panel-flat p-4 anim-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <PhaseLabel n="02" title="Select repos" />
            <span className="mono text-xs" style={{ color: "var(--accent)" }}>
              {filteredRows.length} of {rows.length} found · {selectedCount} selected
            </span>
          </div>
          <input
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            placeholder="Search repos, e.g. commercial-us-hcp-dp"
            className="field-input w-full mb-3"
          />
          <div className="panel-flat p-3 mb-3 text-xs space-y-1" style={{ background: "var(--accent-soft)" }}>
            <p>
              <span className="mono font-semibold" style={{ color: "var(--accent)" }}>
                core
              </span>{" "}
              — repos you&apos;ll actively develop in. Cloned in full and kept in sync.
            </p>
            <p>
              <span className="mono font-semibold">reference</span> — read-only dependency repos, loaded just for
              reference/context (e.g. shared libraries, other services you call). Not meant to be edited here.
            </p>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {filteredRows.length === 0 && (
              <p className="text-sm opacity-70 py-2">No repos match &quot;{repoFilter}&quot;.</p>
            )}
            {filteredRows.map(({ r, i }) => (
              <div
                key={r.name}
                className="panel-flat p-2.5 flex items-center gap-2 flex-wrap"
                style={r.selected ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
              >
                <input type="checkbox" checked={r.selected} onChange={(e) => toggle(i, { selected: e.target.checked })} />
                <span className="mono text-sm flex-1 min-w-[10rem]">{r.name}</span>
                {r.selected && (
                  <SegmentedControl
                    size="sm"
                    value={r.tier}
                    onChange={(tier) => toggle(i, { tier })}
                    options={[
                      { value: "core", label: "core" },
                      { value: "worker", label: "reference" },
                    ]}
                  />
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
          <PhaseLabel n="03" title="Clone repos" />
          <SegmentedControl
            value={scope}
            onChange={setScope}
            options={[
              { value: "--core-only", label: "Core only" },
              { value: "--all", label: "Core + workers" },
            ]}
          />
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
