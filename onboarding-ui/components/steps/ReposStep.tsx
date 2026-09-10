"use client";

import { useEffect, useState } from "react";
import { fetchFileDiff, fetchFileSchema, fetchGhRepos, writeFile } from "@/lib/apiClient";
import { useStepState } from "@/lib/useStepState";
import { DiffView } from "@/components/DiffView";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RunStep } from "@/components/steps/RunStep";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/lib/toast";
import type { DiffResult } from "@/types";

type Row = { name: string; visibility: string; selected: boolean; tier: "core" | "worker" };
type ReposStepState = {
  org: string | undefined;
  rows: Row[];
  repoFilter: string;
};

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
  const [persistedState, setPersistedState] = useStepState<ReposStepState>("repos-config", {
    org: "",
    rows: [],
    repoFilter: "",
  });

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [written, setWritten] = useState(false);
  const [scope, setScope] = useState<"--all" | "--core-only">("--core-only");
  const [cloneRan, setCloneRan] = useState(false);
  const [hookSelection, setHookSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFileSchema("repos-json").then((res) => {
      const current = res.currentValues as { github?: { org?: string }; repos?: Array<{ name: string; tier: "core" | "worker" }> };
      const org = current?.github?.org;
      if (org && org !== "<your-github-org>") {
        setPersistedState((prev) => ({
          ...prev,
          org,
          // Rebuild the summary from what's already on disk if localStorage came back empty
          // (e.g. first load on a new machine/browser after config/repos.json was written by
          // someone else, or local storage was cleared) — otherwise the "Selected repos"
          // section would stay hidden even though the file is already fully configured.
          rows:
            prev.rows.length === 0 && current.repos?.length
              ? current.repos.map((r) => ({ name: r.name, visibility: "unknown", selected: true, tier: r.tier }))
              : prev.rows,
        }));
        setWritten(true);
      }
    });
  }, [setPersistedState]);

  async function loadRepos() {
    if (!persistedState.org?.trim()) {
      setGhError("Enter a GitHub org first.");
      toast.error("Enter a GitHub org first.");
      return;
    }
    setGhError(null);
    setLoadingRepos(true);
    const res = await fetchGhRepos(persistedState.org);
    setLoadingRepos(false);
    if (res.error || !res.repos) {
      setGhError(res.error ?? "Could not load repos");
      toast.error("Could not load repos via gh");
      return;
    }
    setPersistedState((prev) => ({
      ...prev,
      rows: res.repos!.map((r) => ({ name: r.name, visibility: r.visibility, selected: false, tier: "core" as const })),
      repoFilter: "",
    }));
    toast.success(`Loaded ${res.repos!.length} repos from ${persistedState.org}`);
  }

  const filteredRows = persistedState.rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.name.toLowerCase().includes(persistedState.repoFilter.trim().toLowerCase()));

  function toggle(i: number, patch: Partial<Row>) {
    setPersistedState((prev) => ({
      ...prev,
      rows: prev.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    }));
  }

  const selectedCount = persistedState.rows.filter((r) => r.selected).length;
  const selectedCore = persistedState.rows.filter((r) => r.selected && r.tier === "core");
  const selectedReference = persistedState.rows.filter((r) => r.selected && r.tier === "worker");
  const selectedRepos = [...selectedCore, ...selectedReference];

  // Mirrors clone-repos.sh's own layout: core repos land directly under codebase/, workers
  // (labeled "reference" in this UI) under codebase/workers/.
  function repoDir(r: Row): string {
    return r.tier === "worker" ? `codebase/workers/${r.name}` : `codebase/${r.name}`;
  }

  // Default every selected repo to checked whenever the selection itself changes (new repo
  // picked, one deselected) — a repo that drops out of `selectedRepos` also drops out of
  // hookSelection on the next render since only known names are read from it below.
  useEffect(() => {
    setHookSelection((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const r of selectedRepos) {
        if (!(r.name in next)) {
          next[r.name] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepos.map((r) => r.name).join(",")]);

  const hookTargets = selectedRepos.filter((r) => hookSelection[r.name] !== false).map(repoDir);

  function buildValues() {
    const selected = persistedState.rows.filter((r) => r.selected);
    return {
      github: { org: persistedState.org, protocol: "ssh" as const },
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
            value={persistedState.org}
            onChange={(e) => setPersistedState((prev) => ({ ...prev, org: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && loadRepos()}
            placeholder="your-github-org"
            className="field-input flex-1"
          />
          <Button
            variant="secondary"
            onClick={loadRepos}
            loading={loadingRepos}
            disabled={!persistedState.org?.trim()}
            icon={<span>🐙</span>}
          >
            Load via gh
          </Button>
        </div>
        {ghError && <p className="text-sm text-[var(--danger)] mt-2">{ghError}</p>}
      </div>

      {persistedState.rows.length > 0 && (
        <div className="panel-flat p-4 anim-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <PhaseLabel n="02" title="Select repos" />
            <span className="mono text-xs" style={{ color: "var(--accent)" }}>
              {filteredRows.length} of {persistedState.rows.length} found · {selectedCount} selected
            </span>
          </div>
          <input
            value={persistedState.repoFilter}
            onChange={(e) => setPersistedState((prev) => ({ ...prev, repoFilter: e.target.value }))}
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
              <p className="text-sm opacity-70 py-2">No repos match &quot;{persistedState.repoFilter}&quot;.</p>
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

      {/* Summary — sourced from persistedState (localStorage, via useStepState), not from the
          written file. Shown as soon as anything is checked and stays up whether or not
          config/repos.json has been written yet, so the picks are never "lost" while a
          preview/write/clone is in flight or after navigating away and back. */}
      {selectedCount > 0 && (
        <div className="panel-flat p-4 anim-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">✓ Selected repos</span>
            <span className="mono text-xs" style={{ color: "var(--accent)" }}>
              {selectedCount} total · saved locally
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="label-micro block mb-1.5">core ({selectedCore.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCore.length === 0 && <span className="text-xs opacity-60">None selected</span>}
                {selectedCore.map((r) => (
                  <span
                    key={r.name}
                    className="mono text-xs px-2 py-1 border"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="label-micro block mb-1.5">reference ({selectedReference.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedReference.length === 0 && <span className="text-xs opacity-60">None selected</span>}
                {selectedReference.map((r) => (
                  <span key={r.name} className="mono text-xs px-2 py-1 border" style={{ borderColor: "var(--border)" }}>
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-soft)] mt-3">
            {written
              ? "Kept here — and in your browser's local storage — even after config/repos.json is written, so your picks aren't lost while repos clone in the background or if you navigate elsewhere."
              : "Saved to your browser's local storage as you check boxes, before config/repos.json is even written — safe to preview/write whenever you're ready."}
          </p>
        </div>
      )}

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
            onDone={() => {
              setCloneRan(true);
              onWritten();
            }}
          />
        </div>
      )}

      {/* Phase 04 — propagate the hook into each cloned repo. Each core/worker repo is its own
          git repository, so the "Pre-commit hooks" step's install only ever wired up this
          harness repo's own .git/hooks/pre-commit — commits made inside codebase/<repo> still
          need `pre-commit install` run there too, against that repo's own
          .pre-commit-config.yaml (if it has one). Gated on cloneRan so it only appears once
          there's actually something on disk to point pre-commit at. */}
      {written && cloneRan && selectedRepos.length > 0 && (
        <div className="panel-flat p-4 space-y-3 anim-fade-in-up">
          <PhaseLabel n="04" title="Apply pre-commit hooks to cloned repos" />
          <p className="text-sm text-[var(--muted)]">
            Why: the pre-commit hook installed earlier only covers commits made at this harness's own root — each
            cloned repo below is a separate git repo and needs the hook installed inside it too before its own
            commits get checked.
          </p>
          <p className="text-sm text-[var(--muted)]">
            How: pick which cloned repos to wire up (all selected repos are checked by default), then run. Repos
            that aren&apos;t cloned yet, or don&apos;t have their own .pre-commit-config.yaml, are skipped
            automatically — the log below says which and why.
          </p>
          <div className="space-y-1.5">
            {selectedRepos.map((r) => (
              <label key={r.name} className="panel-flat p-2.5 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hookSelection[r.name] !== false}
                  onChange={(e) => setHookSelection((prev) => ({ ...prev, [r.name]: e.target.checked }))}
                />
                <span className="mono flex-1">{repoDir(r)}</span>
                <span className="label-micro">{r.tier === "worker" ? "reference" : "core"}</span>
              </label>
            ))}
          </div>
          <RunStep
            key={hookTargets.join(",")}
            scriptKey="apply-pre-commit-hooks"
            args={hookTargets}
            stepId="apply-pre-commit-hooks"
            label={`Apply hooks to ${hookTargets.length} repo${hookTargets.length === 1 ? "" : "s"}`}
            successMessage="Pre-commit hooks applied"
            confirmBody={`Runs scripts/apply-pre-commit-hooks.sh against: ${hookTargets.join(", ") || "(none selected)"}`}
            onDone={onWritten}
            disabled={hookTargets.length === 0}
          />
          {hookTargets.length === 0 && (
            <p className="text-sm text-[var(--muted-soft)]">Check at least one repo above to enable this.</p>
          )}
        </div>
      )}
    </div>
  );
}
