import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO_ROOT } from "./paths";
import type { ConfluencePageResult } from "@/types";

const execFileAsync = promisify(execFile);

// Node has no first-class Atlassian client, and the harness already ships one in Python
// (atlassian_client/) shared with the Jira integration — rather than duplicating auth/CQL/parsing
// logic in TypeScript, this shells out to atlassian_client/confluence_cli.py, which is a thin
// JSON-in/JSON-out wrapper around ConfluenceClient meant exactly for this. See gh/repos/route.ts
// for the same "shell out, JSON.parse stdout" pattern used elsewhere in this app.
async function runConfluenceCli(args: string[]): Promise<unknown> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("python3", ["-m", "atlassian_client.confluence_cli", ...args], {
      cwd: REPO_ROOT,
      timeout: 20_000,
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (err) {
    // confluence_cli.py always writes JSON to stdout, even on failure (non-zero exit) — execFile
    // still attaches that captured stdout to the rejected error object.
    const withStdout = err as { stdout?: string; message?: string };
    if (withStdout.stdout) {
      stdout = withStdout.stdout;
    } else {
      throw new Error(withStdout.message ?? String(err));
    }
  }

  const parsed = JSON.parse(stdout) as unknown;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "error" in parsed) {
    throw new Error((parsed as { error: string }).error);
  }
  return parsed;
}

export async function searchConfluencePages(query: string, spaceKey?: string, limit = 25): Promise<ConfluencePageResult[]> {
  const args = ["search", query, "--limit", String(limit)];
  if (spaceKey) args.push("--space", spaceKey);
  return (await runConfluenceCli(args)) as ConfluencePageResult[];
}

// Confluence page URLs commonly look like:
//   https://<site>.atlassian.net/wiki/spaces/<SPACE>/pages/<PAGE_ID>/<Title-Slug>
//   https://<site>.atlassian.net/wiki/pages/viewpage.action?pageId=<PAGE_ID>
// Accepts either a full URL or a bare numeric page ID pasted directly.
export function extractConfluencePageId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const pathMatch = trimmed.match(/\/pages\/(\d+)(?:[/?]|$)/);
  if (pathMatch) return pathMatch[1] ?? null;
  const queryMatch = trimmed.match(/pageId=(\d+)/);
  if (queryMatch) return queryMatch[1] ?? null;
  return null;
}

export async function getConfluencePage(pageId: string): Promise<ConfluencePageResult> {
  return (await runConfluenceCli(["get", pageId])) as ConfluencePageResult;
}
