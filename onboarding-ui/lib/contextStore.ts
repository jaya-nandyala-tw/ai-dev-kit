import fs from "node:fs";
import path from "node:path";
import { repoPath } from "./paths";
import { CONTEXT_CATEGORIES } from "@/types";
import type { ContextCategory, ContextItem } from "@/types";

// Acquired context dumps are real markdown files under specs/context/<category>/ — the
// harness's own instructions already expect specs to live under specs/, so this lands directly
// where the rest of the system can find it, per HARNESS-ENGINEERING-FRAMEWORK.md's "Spec-Driven
// Context" pattern. A small index.json alongside them (same idea as .onboarding-state.json) is
// purely a listing cache for this app's own UI — it is never the source of truth for content,
// only for "what's out there and has a draft been generated from it yet."
const INDEX_REL = "specs/context/index.json";
const CONTEXT_ROOT_REL = "specs/context";
const DRAFTS_ROOT_REL = "specs/drafts";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return (base || "context").slice(0, 48);
}

function readIndex(): ContextItem[] {
  const p = repoPath(INDEX_REL);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ContextItem[];
  } catch {
    return [];
  }
}

function writeIndex(items: ContextItem[]) {
  const p = repoPath(INDEX_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(items, null, 2) + "\n", "utf8");
}

function draftRelPath(slug: string): string {
  return `${DRAFTS_ROOT_REL}/${slug}.md`;
}

export function listContextItems(): ContextItem[] {
  return readIndex()
    .map((item) => ({ ...item, hasDraft: fs.existsSync(repoPath(draftRelPath(item.slug))) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContextItem(slug: string): ContextItem | undefined {
  return readIndex().find((i) => i.slug === slug);
}

export function readContextContent(item: ContextItem): string {
  return fs.readFileSync(repoPath(item.relPath), "utf8");
}

export function readDraftContent(slug: string): string | null {
  const p = repoPath(draftRelPath(slug));
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

export { draftRelPath };

const VALID_CATEGORIES = new Set(CONTEXT_CATEGORIES.map((c) => c.value));

export function saveContextItem(input: { title: string; category: ContextCategory; content: string }): ContextItem {
  if (!VALID_CATEGORIES.has(input.category)) {
    throw new Error(`Unknown category "${input.category}".`);
  }
  const items = readIndex();
  const base = slugify(input.title);
  let slug = base;
  let n = 2;
  while (items.some((i) => i.slug === slug)) slug = `${base}-${n++}`;

  const relPath = `${CONTEXT_ROOT_REL}/${input.category}/${slug}.md`;
  const createdAt = new Date().toISOString();
  const trimmed = input.content.trim();
  const summary = trimmed.split("\n")[0]?.slice(0, 140) ?? "";

  const body = `---\ntitle: ${input.title}\ncategory: ${input.category}\nsource: pasted\ndate: ${createdAt}\n---\n\n${trimmed}\n`;
  const abs = repoPath(relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body, "utf8");

  const item: ContextItem = { slug, title: input.title, category: input.category, summary, createdAt, relPath, hasDraft: false };
  writeIndex([item, ...items]);
  return item;
}

export function saveDraft(slug: string, content: string): { relPath: string } {
  const relPath = draftRelPath(slug);
  const abs = repoPath(relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content.trim() + "\n", "utf8");
  return { relPath };
}

const CATEGORY_SPEC_KIND: Record<ContextCategory, string> = {
  "business-workflow": "a business-workflow spec describing the actors, steps, and business rules involved, in the style of a lightweight product spec",
  "tech-guideline": "a tech/architecture guideline spec describing the convention or constraint being documented and when it applies",
  "domain-glossary": "a domain-glossary spec defining the key terms and their meanings",
  "team-convention": "a team-convention spec describing the convention, why it exists, and how to follow it",
  uncategorized: "a spec summarizing the key points",
};

export function buildDraftPrompt(item: Pick<ContextItem, "title" | "category">, content: string): string {
  return [
    `Given the following raw context dump titled "${item.title}", draft ${CATEGORY_SPEC_KIND[item.category]}.`,
    `Write it as clean Markdown with headings, suitable to save as a spec file in this repo's specs/ directory.`,
    `Respond with ONLY the Markdown content — no preamble, no explanation, no code fences.`,
    ``,
    `--- RAW CONTEXT ---`,
    content,
  ].join("\n");
}
