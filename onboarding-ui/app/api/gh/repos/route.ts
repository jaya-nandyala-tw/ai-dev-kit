import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Non-interactive: reimplements the useful part of scripts/select-repos.py's `gh` listing
// natively (see plan's "Scope decisions for v1") instead of proxying its interactive prompts.
export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("org");
  if (!org) return NextResponse.json({ error: "Missing ?org=" }, { status: 400 });

  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["repo", "list", org, "--limit", "300", "--json", "name,visibility,isArchived,updatedAt"],
      { timeout: 20_000 },
    );
    const repos = JSON.parse(stdout) as Array<{
      name: string;
      visibility: string;
      isArchived: boolean;
      updatedAt: string;
    }>;
    return NextResponse.json({ repos: repos.filter((r) => !r.isArchived) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          `Could not list repos for org "${org}" via the gh CLI. Make sure "gh" is installed ` +
          `and you've run "gh auth login". Underlying error: ${message}`,
      },
      { status: 502 },
    );
  }
}
