"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TerminalPane } from "@/components/TerminalPane";
import { createContextItem, fetchContextFile, fetchContextItems, saveContextDraft, startContextDraft } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { CONTEXT_CATEGORIES } from "@/types";
import type { ContextCategory, ContextItem } from "@/types";

// Deliberately not a wizard step (see proposed-features.md) — this is a continuous activity, not
// a one-time setup task, so it lives as its own page, reachable any time.
export default function ContextPage() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  function refresh() {
    fetchContextItems().then((res) => {
      setItems(res.items ?? []);
      setLoaded(true);
    });
  }

  useEffect(refresh, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 anim-fade-in-up">
      <Link href="/">
        <Button variant="ghost" size="sm" icon={<span>←</span>}>
          Home
        </Button>
      </Link>

      <section>
        <p className="label-micro mb-2">Continuous, not one-time</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 max-w-2xl">Acquire &amp; review context.</h1>
        <p className="text-base text-[var(--muted)] max-w-2xl">
          Paste a context dump — meeting notes, a runbook, an old doc — categorize it, and
          optionally draft a real spec from it with Copilot CLI. Stored as real files under{" "}
          <code className="mono text-xs">specs/context/</code>, not a database bolted onto the
          side of this app.
        </p>
      </section>

      <AcquireForm onSaved={refresh} />

      <section>
        <p className="label-micro mb-3">Acquired ({items.length})</p>
        {!loaded ? (
          <p className="text-sm text-[var(--muted-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <div className="panel-flat border-dashed p-6 text-center text-sm text-[var(--muted-soft)]">
            Nothing acquired yet — paste something above to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ContextRow key={item.slug} item={item} onChanged={refresh} />
            ))}
          </div>
        )}
      </section>

      {items.length > 0 && <ContextExplorer items={items} />}
    </div>
  );
}

function AcquireForm({ onSaved }: { onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ContextCategory>("uncategorized");
  const [content, setContent] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await createContextItem({ title: title.trim(), category, content });
    setSaving(false);
    setConfirmOpen(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Saved — ${res.item?.relPath}`);
    setTitle("");
    setContent("");
    setCategory("uncategorized");
    onSaved();
  }

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="panel p-5 space-y-3">
      <span className="label-micro">Acquire</span>
      <input
        className="field-input"
        placeholder='Short title — e.g. "Refund approval workflow"'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="field-input mono text-sm"
        rows={8}
        placeholder="Paste anything — meeting notes, a doc export, a Slack thread…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="field-input"
          style={{ width: "auto" }}
          value={category}
          onChange={(e) => setCategory(e.target.value as ContextCategory)}
        >
          {CONTEXT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <Button variant="primary" size="sm" disabled={!canSave} onClick={() => setConfirmOpen(true)}>
          Save
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Save this context?"
        body={`Writes a new file under specs/context/${category}/ — plain markdown, nothing else is touched.`}
        confirmLabel={saving ? "Saving…" : "Save"}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ContextRow({ item, onChanged }: { item: ContextItem; onChanged: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryLabel = CONTEXT_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;

  async function generate() {
    setGenerating(true);
    setDraft(null);
    const res = await startContextDraft(item.slug);
    setGenerating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRunId(res.runId ?? null);
  }

  async function saveDraftFile() {
    if (!draft) return;
    setSaving(true);
    const res = await saveContextDraft(item.slug, draft);
    setSaving(false);
    setConfirmOpen(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Draft saved — ${res.relPath}`);
    setRunId(null);
    setDraft(null);
    onChanged();
  }

  return (
    <div className="panel-flat p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{item.title}</p>
          <p className="mono text-xs text-[var(--muted-soft)] truncate">{item.relPath}</p>
          {item.summary && <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{item.summary}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge">{categoryLabel}</span>
          {item.hasDraft && (
            <span className="badge" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>
              ✓ Draft exists
            </span>
          )}
        </div>
      </div>

      {!runId && !draft && (
        <Button variant="secondary" size="sm" onClick={generate} loading={generating}>
          {item.hasDraft ? "Regenerate spec draft" : "Draft a spec with Copilot"}
        </Button>
      )}

      {runId && !draft && (
        <TerminalPane
          runId={runId}
          onOutput={(text) => setDraft(text.trim())}
          onExit={(code) => {
            if (code !== 0) toast.error("Copilot suggestion failed — see output above.");
          }}
        />
      )}

      {draft && (
        <div className="space-y-2 anim-fade-in-up">
          <span className="label-micro">Review before saving</span>
          <textarea className="field-input mono text-xs" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)}>
              Save as specs/drafts/{item.slug}.md
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(null);
                setRunId(null);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Save generated spec draft?"
        body={`Writes specs/drafts/${item.slug}.md with the text you just reviewed above.`}
        confirmLabel={saving ? "Saving…" : "Save"}
        onConfirm={saveDraftFile}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

/** Two-pane browser: a category-grouped list of every acquired file on the left, a read-only
 * preview (with a Draft tab when one exists) on the right — separate from ContextRow above,
 * which is for acting on an item (generate/save), not just reading what's already there. */
function ContextExplorer({ items }: { items: ContextItem[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<"source" | "draft">("source");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<{ sourceContent: string; draftContent: string | null } | null>(null);

  async function select(slug: string) {
    setSelectedSlug(slug);
    setTab("source");
    setLoading(true);
    const res = await fetchContextFile(slug);
    setLoading(false);
    if (res.error || res.sourceContent === undefined) {
      toast.error(res.error ?? "Could not load that file.");
      setFile(null);
      return;
    }
    setFile({ sourceContent: res.sourceContent, draftContent: res.draftContent ?? null });
  }

  const grouped = CONTEXT_CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => i.category === c.value),
  })).filter((g) => g.items.length > 0);

  return (
    <section>
      <p className="label-micro mb-3">Explore</p>
      <div className="panel grid lg:grid-cols-12" style={{ minHeight: "26rem" }}>
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[var(--border-soft)] max-h-[32rem] overflow-y-auto">
          {grouped.map((g) => (
            <div key={g.category.value}>
              <p className="label-micro px-3 py-2 sticky top-0" style={{ background: "var(--bg-elevated)" }}>
                {g.category.label}
              </p>
              {g.items.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => select(item.slug)}
                  className="w-full text-left px-3 py-2.5 text-sm border-t transition-colors"
                  style={{
                    borderColor: "var(--border-soft)",
                    background: selectedSlug === item.slug ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  <span className="block font-medium truncate">{item.title}</span>
                  {item.hasDraft && (
                    <span className="mono text-xs" style={{ color: "var(--ok)" }}>
                      ✓ draft
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 p-4 flex flex-col">
          {!selectedSlug ? (
            <p className="text-sm text-[var(--muted-soft)] m-auto">Select a file on the left to preview it.</p>
          ) : loading ? (
            <p className="text-sm text-[var(--muted-soft)] m-auto">Loading…</p>
          ) : (
            <>
              <div className="flex gap-1 mb-3 shrink-0">
                <button
                  onClick={() => setTab("source")}
                  className="mono text-xs uppercase tracking-wide px-3 py-1.5 border-b-2 transition-colors"
                  style={tab === "source" ? { color: "var(--accent)", borderColor: "var(--accent)" } : { color: "var(--muted)", borderColor: "transparent" }}
                >
                  Source
                </button>
                {file?.draftContent && (
                  <button
                    onClick={() => setTab("draft")}
                    className="mono text-xs uppercase tracking-wide px-3 py-1.5 border-b-2 transition-colors"
                    style={tab === "draft" ? { color: "var(--accent)", borderColor: "var(--accent)" } : { color: "var(--muted)", borderColor: "transparent" }}
                  >
                    Draft
                  </button>
                )}
              </div>
              <pre
                className="mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto p-3 min-h-0"
                style={{ background: "var(--bg-elevated)", maxHeight: "28rem" }}
              >
                {tab === "draft" ? file?.draftContent : file?.sourceContent}
              </pre>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
