"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TerminalPane } from "@/components/TerminalPane";
import { DiffView } from "@/components/DiffView";
import {
  createContextItem,
  extractPdfContext,
  fetchAtlassianConfigured,
  fetchContextFile,
  fetchContextItems,
  loadConfluencePage,
  parseSpecOutput,
  saveContextDraft,
  searchConfluencePages,
  startContextDraft,
  startSpecGeneration,
  writeSpecFiles,
} from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { CONTEXT_CATEGORIES } from "@/types";
import type { ConfluencePageResult, ContextCategory, ContextItem, ContextSource, SpecFilePreview } from "@/types";

const SOURCE_LABEL: Record<ContextSource, string> = { pasted: "Pasted", pdf: "PDF", confluence: "Confluence" };

// Deliberately not a wizard step (see proposed-features.md) — this is a continuous activity, not
// a one-time setup task, so it lives as its own page, reachable any time.
export default function ContextPage() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function refresh() {
    fetchContextItems().then((res) => {
      setItems(res.items ?? []);
      setLoaded(true);
    });
  }

  useEffect(refresh, []);

  // Selection is constrained to one category at a time — the combined-spec prompt template is
  // written for "here's N dumps, all about category X", not a free mix.
  const selectedCategory = items.find((i) => selected.has(i.slug))?.category ?? null;

  function toggleSelect(item: ContextItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.slug)) {
        next.delete(item.slug);
      } else if (!selectedCategory || selectedCategory === item.category) {
        next.add(item.slug);
      }
      return next;
    });
  }

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
          Bring in a context dump — paste it directly, upload a PDF, or pull a page straight from
          Confluence — categorize it, and optionally draft a real spec from it with Copilot CLI.
          Stored as real files under <code className="mono text-xs">specs/context/</code>, not a
          database bolted onto the side of this app.
        </p>
      </section>

      <AcquireForm onSaved={refresh} />

      <section className="space-y-3">
        <p className="label-micro mb-3">Acquired ({items.length})</p>
        {!loaded ? (
          <p className="text-sm text-[var(--muted-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <div className="panel-flat border-dashed p-6 text-center text-sm text-[var(--muted-soft)]">
            Nothing acquired yet — paste something above to get started.
          </div>
        ) : (
          <>
            {selected.size > 0 && (
              <CombinedSpecPanel
                items={items.filter((i) => selected.has(i.slug))}
                onClear={() => setSelected(new Set())}
                onDone={() => {
                  setSelected(new Set());
                  refresh();
                }}
              />
            )}
            <div className="space-y-2">
              {items.map((item) => (
                <ContextRow
                  key={item.slug}
                  item={item}
                  onChanged={refresh}
                  selected={selected.has(item.slug)}
                  selectDisabled={selectedCategory !== null && selectedCategory !== item.category && !selected.has(item.slug)}
                  onToggleSelect={() => toggleSelect(item)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {items.length > 0 && <ContextExplorer items={items} />}
    </div>
  );
}

type AcquireMode = "paste" | "pdf" | "confluence";

function ModeTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mono text-xs uppercase tracking-wide px-3 py-1.5 border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={active ? { color: "var(--accent)", borderColor: "var(--accent)" } : { color: "var(--muted)", borderColor: "transparent" }}
    >
      {children}
    </button>
  );
}

function AcquireForm({ onSaved }: { onSaved: () => void }) {
  const [mode, setMode] = useState<AcquireMode>("paste");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ContextCategory>("uncategorized");
  const [content, setContent] = useState("");
  const [source, setSource] = useState<ContextSource>("pasted");
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // null = still checking; the Confluence tab stays disabled until this resolves to true.
  const [atlassianConfigured, setAtlassianConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAtlassianConfigured().then((res) => setAtlassianConfigured(res.configured));
  }, []);

  function applyLoaded(loadedTitle: string, loadedContent: string, loadedSource: ContextSource, loadedUrl?: string) {
    setTitle(loadedTitle);
    setContent(loadedContent);
    setSource(loadedSource);
    setSourceUrl(loadedUrl);
  }

  async function save() {
    setSaving(true);
    const res = await createContextItem({ title: title.trim(), category, content, source, sourceUrl });
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
    setSource("pasted");
    setSourceUrl(undefined);
    setMode("paste");
    onSaved();
  }

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="panel p-5 space-y-3">
      <span className="label-micro">Acquire</span>

      <div className="flex gap-1 border-b border-[var(--border-soft)]">
        <ModeTab active={mode === "paste"} onClick={() => setMode("paste")}>
          Paste text
        </ModeTab>
        <ModeTab active={mode === "pdf"} onClick={() => setMode("pdf")}>
          Upload PDF
        </ModeTab>
        <ModeTab
          active={mode === "confluence"}
          disabled={!atlassianConfigured}
          onClick={() => atlassianConfigured && setMode("confluence")}
        >
          From Confluence
        </ModeTab>
      </div>

      {mode === "confluence" && atlassianConfigured === false && (
        <p className="text-xs text-[var(--muted-soft)]">
          Set <code className="mono">JIRA_BASE_URL</code> and <code className="mono">JIRA_API_TOKEN</code> in{" "}
          <code className="mono">.env</code> to enable this — Confluence reuses the same Atlassian credentials as{" "}
          <Link href="/steps/jira" className="underline">
            the Jira integration step
          </Link>
          .
        </p>
      )}

      {mode === "pdf" && <PdfUploadPanel onExtracted={(t, c) => applyLoaded(t, c, "pdf")} />}

      {mode === "confluence" && atlassianConfigured && (
        <ConfluencePanel onLoaded={(t, c, url) => applyLoaded(t, c, "confluence", url)} />
      )}

      <input
        className="field-input"
        placeholder='Short title — e.g. "Refund approval workflow"'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="field-input mono text-sm"
        rows={8}
        placeholder={
          mode === "paste" ? "Paste anything — meeting notes, a doc export, a Slack thread…" : "Loaded content — review and edit before saving…"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {sourceUrl && <p className="mono text-xs text-[var(--muted-soft)] truncate">Source: {sourceUrl}</p>}
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

function PdfUploadPanel({ onExtracted }: { onExtracted: (title: string, content: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  async function extract() {
    if (!file) return;
    setExtracting(true);
    const res = await extractPdfContext(file);
    setExtracting(false);
    if (res.error || res.content === undefined) {
      toast.error(res.error ?? "Could not extract text from that PDF.");
      return;
    }
    onExtracted(res.title || file.name.replace(/\.pdf$/i, ""), res.content);
    toast.success("Extracted — review the content below before saving.");
  }

  return (
    <div className="panel-flat p-3 flex items-center gap-3 flex-wrap">
      <input
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Button variant="secondary" size="sm" disabled={!file} loading={extracting} onClick={extract}>
        Extract text
      </Button>
    </div>
  );
}

function ConfluencePanel({ onLoaded }: { onLoaded: (title: string, content: string, url: string) => void }) {
  const [link, setLink] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ConfluencePageResult[] | null>(null);
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);

  function applyPage(page: ConfluencePageResult) {
    onLoaded(page.title, page.body ?? "", page.url);
    toast.success("Loaded — review the content below before saving.");
  }

  async function loadFromLink() {
    if (!link.trim()) return;
    setLoadingLink(true);
    const res = await loadConfluencePage(link.trim());
    setLoadingLink(false);
    if (res.error || !res.page) {
      toast.error(res.error ?? "Could not load that page.");
      return;
    }
    applyPage(res.page);
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);
    const res = await searchConfluencePages(query.trim());
    setSearching(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setResults(res.pages ?? []);
  }

  async function loadResult(page: ConfluencePageResult) {
    setLoadingResultId(page.id);
    const res = await loadConfluencePage(page.id);
    setLoadingResultId(null);
    if (res.error || !res.page) {
      toast.error(res.error ?? "Could not load that page.");
      return;
    }
    applyPage(res.page);
  }

  return (
    <div className="panel-flat p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="field-input flex-1"
          style={{ minWidth: "16rem" }}
          placeholder="Paste a Confluence page link (or page ID)…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadFromLink()}
        />
        <Button variant="secondary" size="sm" disabled={!link.trim()} loading={loadingLink} onClick={loadFromLink}>
          Load
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="field-input flex-1"
          style={{ minWidth: "16rem" }}
          placeholder="…or search Confluence by text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button variant="secondary" size="sm" disabled={!query.trim()} loading={searching} onClick={search}>
          Search
        </Button>
      </div>

      {results &&
        (results.length === 0 ? (
          <p className="text-xs text-[var(--muted-soft)]">No pages found.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadResult(p)}
                disabled={loadingResultId === p.id}
                className="w-full text-left px-2 py-1.5 text-sm border-t border-[var(--border-soft)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                <span className="block font-medium truncate">{loadingResultId === p.id ? "Loading…" : p.title}</span>
                <span className="mono text-xs text-[var(--muted-soft)] truncate block">
                  {p.spaceKey}
                  {p.excerpt ? ` — ${p.excerpt}` : ""}
                </span>
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

/** Turns N selected context items (all one category) into a small set of Markdown files —
 * an index.md plus optional sub-flow files, per the "progressive disclosure" principle — via
 * one Copilot CLI call, previewed as per-file diffs and only written on explicit confirmation. */
function CombinedSpecPanel({ items, onClear, onDone }: { items: ContextItem[]; onClear: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [baseSlug, setBaseSlug] = useState<string | null>(null);
  const [files, setFiles] = useState<SpecFilePreview[] | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryLabel = CONTEXT_CATEGORIES.find((c) => c.value === items[0]?.category)?.label ?? items[0]?.category;

  function reset() {
    setRunId(null);
    setBaseSlug(null);
    setFiles(null);
    setEdited({});
    setParseError(null);
    setRawOutput(null);
  }

  async function generate() {
    if (!title.trim()) return;
    setGenerating(true);
    reset();
    const res = await startSpecGeneration({ slugs: items.map((i) => i.slug), title: title.trim() });
    setGenerating(false);
    if (res.error || !res.runId || !res.baseSlug) {
      toast.error(res.error ?? "Could not start generation.");
      return;
    }
    setRunId(res.runId);
    setBaseSlug(res.baseSlug);
  }

  async function handleOutput(text: string) {
    if (!baseSlug) return;
    const res = await parseSpecOutput({ baseSlug, rawOutput: text });
    if (res.error || !res.files) {
      setParseError(res.error ?? "Could not parse Copilot's response.");
      setRawOutput(res.raw ?? text);
      return;
    }
    setFiles(res.files);
    setEdited(Object.fromEntries(res.files.map((f) => [f.relPath, f.diff.proposed])));
  }

  async function save() {
    if (!baseSlug || !files) return;
    setSaving(true);
    const res = await writeSpecFiles({
      baseSlug,
      files: files.map((f) => ({ relPath: f.relPath, content: edited[f.relPath] ?? f.diff.proposed })),
      confirmedHashes: Object.fromEntries(files.map((f) => [f.relPath, f.diff.currentHash])),
    });
    setSaving(false);
    setConfirmOpen(false);
    if (res.error || !res.ok) {
      const failed = res.results?.filter((r) => !r.ok).map((r) => `${r.relPath}: ${r.reason}`);
      toast.error(res.error ?? failed?.join("; ") ?? "Some files could not be written.");
      return;
    }
    toast.success(`Saved ${files.length} file(s) under specs/drafts/${baseSlug}/`);
    onDone();
  }

  return (
    <div className="panel p-5 space-y-3 border-2" style={{ borderColor: "var(--accent)" }}>
      <div className="flex items-center justify-between gap-3">
        <span className="label-micro">
          Generate combined spec — {items.length} selected ({categoryLabel})
        </span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear selection
        </Button>
      </div>

      {!runId && (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            className="field-input flex-1"
            style={{ minWidth: "16rem" }}
            placeholder='Combined spec title — e.g. "Refunds overview"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button variant="primary" size="sm" disabled={!title.trim()} loading={generating} onClick={generate}>
            Generate
          </Button>
        </div>
      )}

      {runId && !files && !parseError && (
        <TerminalPane
          runId={runId}
          onOutput={handleOutput}
          onExit={(code) => {
            if (code !== 0) toast.error("Copilot generation failed — see output above.");
          }}
        />
      )}

      {parseError && (
        <div className="space-y-2 anim-fade-in-up">
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {parseError}
          </p>
          {rawOutput && (
            <pre className="mono text-xs whitespace-pre-wrap p-3 max-h-48 overflow-y-auto" style={{ background: "var(--bg-elevated)" }}>
              {rawOutput}
            </pre>
          )}
          <Button variant="ghost" size="sm" onClick={reset}>
            Discard
          </Button>
        </div>
      )}

      {files && (
        <div className="space-y-4 anim-fade-in-up">
          <span className="label-micro">Review each file before saving</span>
          {files.map((f) => (
            <div key={f.relPath} className="space-y-2">
              <p className="mono text-xs text-[var(--muted-soft)]">
                specs/drafts/{baseSlug}/{f.relPath}
              </p>
              <DiffView diff={f.diff} />
              <span className="label-micro">Edit before saving</span>
              <textarea
                className="field-input mono text-xs"
                rows={8}
                value={edited[f.relPath] ?? ""}
                onChange={(e) => setEdited((prev) => ({ ...prev, [f.relPath]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)}>
              Save {files.length} file(s)
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Write these spec files?"
        body={`Writes ${files?.length ?? 0} file(s) under specs/drafts/${baseSlug}/ — any existing file with the same name is backed up first (.bak-<timestamp>).`}
        confirmLabel={saving ? "Saving…" : "Save"}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ContextRow({
  item,
  onChanged,
  selected,
  selectDisabled,
  onToggleSelect,
}: {
  item: ContextItem;
  onChanged: () => void;
  selected: boolean;
  selectDisabled: boolean;
  onToggleSelect: () => void;
}) {
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
        <div className="min-w-0 flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            disabled={selectDisabled}
            onChange={onToggleSelect}
            title={selectDisabled ? "Clear your current selection to pick items from a different category" : "Select for a combined spec"}
            className="mt-1 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{item.title}</p>
            <p className="mono text-xs text-[var(--muted-soft)] truncate">{item.relPath}</p>
            {item.summary && <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{item.summary}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge">{categoryLabel}</span>
          <span className="badge">{SOURCE_LABEL[item.source]}</span>
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
