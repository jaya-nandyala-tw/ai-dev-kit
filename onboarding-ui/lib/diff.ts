import fs from "node:fs";
import crypto from "node:crypto";
import { createTwoFilesPatch } from "diff";
import type { DiffResult } from "@/types";

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Three-way diff: bundled baseline template vs. real on-disk content vs. the wizard's proposed
 * new content. `customized` tells the UI whether the on-disk file has already diverged from the
 * shipped placeholder (i.e. someone already hand-edited it) — in that case the diff shown to the
 * user is current -> proposed (not baseline -> proposed), and writing requires a stronger
 * confirmation upstream in the write route.
 */
export function buildDiff(params: {
  key: string;
  absolutePath: string;
  baseline: string;
  proposed: string;
}): DiffResult {
  const { key, absolutePath, baseline, proposed } = params;
  const currentExists = fs.existsSync(absolutePath);
  const current = currentExists ? fs.readFileSync(absolutePath, "utf8") : "";
  const customized = currentExists && current !== baseline;

  const from = customized ? current : currentExists ? current : baseline;
  const unifiedDiff = createTwoFilesPatch(
    currentExists ? "current" : "baseline (file does not exist yet)",
    "proposed",
    from,
    proposed,
    "",
    "",
    { context: 3 },
  );

  return {
    key,
    path: absolutePath,
    baseline,
    current,
    proposed,
    currentExists,
    customized,
    unifiedDiff,
    currentHash: hashContent(current),
  };
}
