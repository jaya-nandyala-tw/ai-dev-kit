"use client";

import { useEffect, useState } from "react";
import { fetchFileDiff, fetchFileSchema, writeFile } from "@/lib/apiClient";
import { GenericFileForm } from "@/components/GenericFileForm";
import { DiffView } from "@/components/DiffView";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import type { DiffResult, FieldSchema } from "@/types";

export function FileFormStep({
  fileKey,
  stepId,
  onWritten,
  extraFieldsNote,
  fieldFilter,
}: {
  fileKey: string;
  stepId: string;
  onWritten: () => void;
  extraFieldsNote?: string;
  /** Only render/submit these field names (the rest of the current file's values are still
   * preserved by the server-side upsert logic) — lets two steps share one underlying file
   * (e.g. "env") without each showing every field the other cares about. */
  fieldFilter?: string[];
}) {
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [relPaths, setRelPaths] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    fetchFileSchema(fileKey).then((res) => {
      setFields(fieldFilter ? res.fields.filter((f) => fieldFilter.includes(f.name)) : res.fields);
      setRelPaths(res.relPaths);
      setValues(res.currentValues ?? {});
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  async function preview() {
    setError(null);
    setPreviewing(true);
    const res = await fetchFileDiff(fileKey, values);
    setPreviewing(false);
    if ("error" in res) {
      setError((res as { error: string }).error);
      return;
    }
    setDiffs(res.diffs);
    const anyChange = res.diffs.some((d) => d.current !== d.proposed);
    if (!anyChange) toast.info("No changes to write.");
  }

  const anyCustomized = diffs?.some((d) => d.customized) ?? false;

  async function commit(force: boolean) {
    if (!diffs) return;
    const confirmedHashes: Record<string, string> = {};
    relPaths.forEach((rp, i) => {
      if (diffs[i]) confirmedHashes[rp] = diffs[i].currentHash;
    });
    setBusy(true);
    const res = await writeFile(fileKey, values, confirmedHashes, force, stepId);
    setBusy(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error ?? "Write failed — see results.");
      toast.error(res.error ?? "Write failed");
      return;
    }
    setDiffs(null);
    toast.success(`${relPaths[relPaths.length - 1] ?? "File"} updated`);
    onWritten();
  }

  if (!loaded) {
    return <div className="panel-flat p-6 text-sm text-[var(--muted-soft)]">Loading current values…</div>;
  }

  return (
    <div className="space-y-4">
      {extraFieldsNote && <p className="text-sm text-[var(--muted)]">{extraFieldsNote}</p>}
      {fields.length > 0 && (
        <div className="panel p-4 anim-fade-in-up">
          <GenericFileForm fields={fields} values={values} onChange={(name, v) => setValues((prev) => ({ ...prev, [name]: v }))} />
        </div>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={preview} loading={previewing}>
          Preview diff
        </Button>
        {diffs && (
          <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={busy}>
            Write
          </Button>
        )}
      </div>

      {diffs && (
        <div className="space-y-3 anim-fade-in-up">
          {diffs.map((d, i) => (
            <DiffView key={i} diff={d} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Write ${relPaths.join(", ")}`}
        body={
          anyCustomized
            ? "One or more of these files were already hand-edited (they no longer match the shipped placeholder). Writing will overwrite that customization — a timestamped .bak copy will be made first."
            : "This writes the diff shown above to disk. A timestamped .bak copy is made if the file already exists."
        }
        requireCheckbox={anyCustomized ? "I understand this overwrites a file that was already customized." : undefined}
        confirmLabel="Write to disk"
        onConfirm={() => commit(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
