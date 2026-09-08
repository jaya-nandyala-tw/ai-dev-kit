import fs from "node:fs";
import { NextResponse } from "next/server";
import { repoPath } from "@/lib/paths";
import { markStepMeta } from "@/lib/stateStore";

type ReposDoc = {
  repos?: Array<{ name: string; tier: "core" | "worker" }>;
};

// Matches the exact shape scripts/workspace.py expects to read/rewrite — see its
// BASE_FOLDERS/WORKER_FOLDER/write_workspace(). Generated in "reset" state (nothing hidden) so
// workspace.sh core|group <name> has something sane to toggle from.
export async function POST() {
  const reposPath = repoPath("config/repos.json");
  if (!fs.existsSync(reposPath)) {
    return NextResponse.json({ error: "config/repos.json does not exist yet — configure repos first." }, { status: 400 });
  }
  const doc = JSON.parse(fs.readFileSync(reposPath, "utf8")) as ReposDoc;
  const repos = doc.repos ?? [];
  const coreRepos = repos.filter((r) => r.tier === "core");
  const hasWorkers = repos.some((r) => r.tier === "worker");

  const folders = [
    { name: "── AI Context ───", path: "." },
    { name: "📋 Specs", path: "specs" },
    ...coreRepos.map((r) => ({ name: r.name, path: `codebase/${r.name}` })),
    ...(hasWorkers ? [{ name: "Workers", path: "codebase/workers" }] : []),
  ];

  const workspace = { folders, settings: { "files.exclude": {} } };
  fs.writeFileSync(repoPath("ai-workspace.code-workspace"), JSON.stringify(workspace, null, 2) + "\n", "utf8");
  markStepMeta("vscode-workspace");

  return NextResponse.json({ ok: true, folders: folders.length });
}
