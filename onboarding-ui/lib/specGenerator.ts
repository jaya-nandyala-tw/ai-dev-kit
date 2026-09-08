import fs from "node:fs";
import path from "node:path";
import { repoPath } from "./paths";
import { buildDiff, hashContent } from "./diff";
import { CATEGORY_SPEC_KIND } from "./contextStore";
import { CONTEXT_CATEGORIES } from "@/types";
import type { ContextCategory, SpecFilePreview } from "@/types";

// Aggregated ("combined") spec generation: N raw context dumps (all one category) go in, a small
// set of Markdown files come out under specs/drafts/<baseSlug>/ — see types/index.ts's
// SpecFilePreview comment for the progressive-disclosure rationale.
const DRAFTS_ROOT_REL = "specs/drafts";

export function specDirRelPath(baseSlug: string): string {
  return `${DRAFTS_ROOT_REL}/${baseSlug}`;
}

// Lowercase kebab-case, ending in .md — deliberately strict since this becomes a filesystem path
// segment under repoPath(); both the parser (trusting Copilot's output) and the write route
// (trusting a client-submitted array, even though it originated from the parse response) run
// every relPath through this before it ever reaches fs.writeFileSync.
const RELPATH_RE = /^[a-z0-9][a-z0-9-]{0,80}\.md$/;

export function isValidSpecFileName(name: string): boolean {
  return RELPATH_RE.test(name);
}

export function buildAggregatedSpecPrompt(
  items: { title: string; content: string }[],
  category: ContextCategory,
  specTitle: string,
): string {
  const categoryLabel = CONTEXT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const kind = CATEGORY_SPEC_KIND[category];
  const sources = items.map((item, i) => `--- SOURCE ${i + 1}: "${item.title}" ---\n${item.content.trim()}`).join("\n\n");

  return [
    `You are drafting ${kind}, titled "${specTitle}", by combining ${items.length} raw context dump(s) below into ONE clean spec.`,
    ``,
    `Rules:`,
    `1. Category scope: only keep information relevant to "${categoryLabel}". Drop anything unrelated, even if it appears in a source dump — do not carry over noise just because it was pasted in.`,
    `2. Deduplicate: if multiple sources repeat the same fact, state it once.`,
    `3. Progressive disclosure: produce an "index.md" with a short overview and a "## Contents" section linking to any other files you create (relative links, e.g. "- [Password reset](./password-reset-flow.md)"). If the material covers exactly one coherent topic, index.md may be the ONLY file — do not force an artificial split. If it covers multiple distinct sub-flows or sub-topics, split each into its own file, so a future reader (or agent) can load just the one relevant file instead of the whole thing.`,
    `4. Each file must be clean Markdown with headings — no preamble, no meta-commentary about this process.`,
    `5. File names: lowercase kebab-case, ending in ".md" (e.g. "index.md", "password-reset-flow.md").`,
    ``,
    `Respond with ONLY a JSON array — no markdown code fences, no prose before or after it. Each element:`,
    `{"relPath": "<filename>.md", "title": "<short title>", "content": "<full markdown content>"}`,
    `Exactly one element must have relPath "index.md".`,
    ``,
    `--- RAW SOURCES (${items.length}) ---`,
    sources,
  ].join("\n");
}

type ParsedSpecFile = { relPath: string; title: string; content: string };

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function parseAggregatedSpecOutput(raw: string): { files: ParsedSpecFile[] } | { error: string } {
  const stripped = stripCodeFence(raw);
  if (!stripped) return { error: "Copilot returned an empty response." };

  let data: unknown;
  try {
    data = JSON.parse(stripped);
  } catch {
    return { error: "Copilot's response was not valid JSON — see the raw output below." };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { error: "Expected a non-empty JSON array of files." };
  }

  const files: ParsedSpecFile[] = [];
  const seen = new Set<string>();
  for (const entry of data) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as Record<string, unknown>).relPath !== "string" ||
      typeof (entry as Record<string, unknown>).content !== "string"
    ) {
      return { error: `Each file must have string "relPath" and "content" fields. Got: ${JSON.stringify(entry)}` };
    }
    const relPath = ((entry as Record<string, unknown>).relPath as string).trim().toLowerCase();
    if (!isValidSpecFileName(relPath)) {
      return { error: `Invalid file name "${relPath}" — expected lowercase kebab-case ending in ".md".` };
    }
    if (seen.has(relPath)) {
      return { error: `Duplicate file name "${relPath}" in Copilot's response.` };
    }
    seen.add(relPath);
    const titleRaw = (entry as Record<string, unknown>).title;
    files.push({
      relPath,
      title: typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : relPath,
      content: ((entry as Record<string, unknown>).content as string).trim(),
    });
  }

  if (!files.some((f) => f.relPath === "index.md")) {
    return { error: 'Copilot\'s response is missing an "index.md" file.' };
  }

  return { files };
}

export function buildSpecFilePreviews(baseSlug: string, files: ParsedSpecFile[]): SpecFilePreview[] {
  const dir = specDirRelPath(baseSlug);
  return files.map((f) => {
    const relPath = `${dir}/${f.relPath}`;
    const proposed = f.content.endsWith("\n") ? f.content : `${f.content}\n`;
    const diff = buildDiff({
      key: `spec:${baseSlug}/${f.relPath}`,
      absolutePath: repoPath(relPath),
      baseline: "",
      proposed,
    });
    return { relPath: f.relPath, title: f.title, diff };
  });
}

export function writeSpecFiles(
  baseSlug: string,
  files: { relPath: string; content: string }[],
  confirmedHashes: Record<string, string>,
  force: boolean,
): { relPath: string; ok: boolean; backupPath?: string; reason?: string }[] {
  const dir = specDirRelPath(baseSlug);
  return files.map((f) => {
    if (!isValidSpecFileName(f.relPath)) {
      return { relPath: f.relPath, ok: false, reason: `Invalid file name "${f.relPath}".` };
    }
    const relPath = `${dir}/${f.relPath}`;
    const absolute = repoPath(relPath);
    const existsNow = fs.existsSync(absolute);
    const currentNow = existsNow ? fs.readFileSync(absolute, "utf8") : "";
    const confirmedHash = confirmedHashes[f.relPath];

    if (!force && confirmedHash && hashContent(currentNow) !== confirmedHash) {
      return { relPath, ok: false, reason: "File changed on disk since the diff was shown — regenerate and try again." };
    }

    let backupPath: string | undefined;
    if (existsNow) {
      backupPath = `${absolute}.bak-${Date.now()}`;
      fs.copyFileSync(absolute, backupPath);
    }

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const body = f.content.endsWith("\n") ? f.content : `${f.content}\n`;
    fs.writeFileSync(absolute, body, "utf8");
    return { relPath, ok: true, backupPath };
  });
}
