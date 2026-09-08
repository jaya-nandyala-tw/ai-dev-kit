import fs from "node:fs";
import path from "node:path";

// NOTE on why this doesn't derive from import.meta.url / __dirname: Next.js bundles each route
// handler into its own chunk under .next/server/**, so a compiled route's module location does
// NOT reflect this source file's real path on disk once built — deriving "../.." from it would
// silently resolve to the wrong directory outside of `next dev`. Instead we search upward from
// process.cwd() (and a couple of likely relative candidates) for known marker files, the same
// way tools like git find a repo root — then verify before trusting it.
const MARKER_FILES = ["scripts/clone-repos.sh", "config/repos.json", "ONBOARDING.md"];

function looksLikeRepoRoot(candidate: string): boolean {
  return MARKER_FILES.every((marker) => fs.existsSync(path.join(candidate, marker)));
}

function candidateRoots(): string[] {
  const cwd = process.cwd();
  const candidates = [cwd];
  // Walk upward a few levels in case cwd is onboarding-ui/ itself (the common `cd onboarding-ui
  // && npm run dev` case) or a nested subdirectory of it.
  let dir = cwd;
  for (let i = 0; i < 4; i++) {
    dir = path.dirname(dir);
    candidates.push(dir);
  }
  return candidates;
}

function resolveRepoRoot(): string {
  const override = process.env.REPO_ROOT_OVERRIDE;
  if (override) {
    const resolved = path.resolve(override);
    if (!looksLikeRepoRoot(resolved)) {
      throw new Error(
        `REPO_ROOT_OVERRIDE="${resolved}" does not look like the starter-kit repo root ` +
          `(missing one of: ${MARKER_FILES.join(", ")}).`,
      );
    }
    return resolved;
  }

  for (const candidate of candidateRoots()) {
    if (looksLikeRepoRoot(candidate)) return candidate;
  }

  throw new Error(
    `onboarding-ui cannot find the parent repo checkout by searching upward from ` +
      `"${process.cwd()}" (looking for: ${MARKER_FILES.join(", ")}). ` +
      `Run this from inside onboarding-ui/ (or its parent), or set REPO_ROOT_OVERRIDE to the repo root.`,
  );
}

export const REPO_ROOT = resolveRepoRoot();

export function repoPath(...segments: string[]): string {
  const resolved = path.resolve(REPO_ROOT, ...segments);
  // Defense in depth for any path built from user input (e.g. a repo name) — never let a
  // resolved path escape the repo root.
  if (resolved !== REPO_ROOT && !resolved.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Refusing to resolve a path outside the repo root: ${segments.join("/")}`);
  }
  return resolved;
}

export const ONBOARDING_UI_DIR = path.join(REPO_ROOT, "onboarding-ui");
export const STATE_FILE_PATH = path.join(ONBOARDING_UI_DIR, ".onboarding-state.json");
