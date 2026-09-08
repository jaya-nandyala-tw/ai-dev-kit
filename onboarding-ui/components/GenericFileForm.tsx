"use client";

import type { FieldSchema } from "@/types";
import { Button } from "@/components/ui/Button";

type TableRow = Record<string, string>;

export function GenericFileForm({
  fields,
  values,
  onChange,
}: {
  fields: FieldSchema[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        if (field.type === "table") {
          const rows = (values[field.name] as TableRow[] | undefined) ?? [];
          return (
            <TableField
              key={field.name}
              field={field}
              rows={rows}
              onChange={(next) => onChange(field.name, next)}
            />
          );
        }
        if (field.type === "textarea") {
          return (
            <div key={field.name}>
              <label className="block text-sm mb-1.5 font-semibold">{field.label}</label>
              <textarea
                className="field-input mono"
                rows={5}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? "")}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
              {field.help && <p className="text-xs text-[var(--muted-soft)] mt-1">{field.help}</p>}
            </div>
          );
        }
        return (
          <div key={field.name}>
            <label className="block text-sm mb-1.5 font-semibold">{field.label}</label>
            <input
              className="field-input"
              placeholder={field.placeholder}
              value={String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
            {field.help && <p className="text-xs text-[var(--muted-soft)] mt-1">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

function TableField({
  field,
  rows,
  onChange,
}: {
  field: FieldSchema;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
}) {
  const columns = field.columns ?? [];

  function updateCell(rowIndex: number, colName: string, value: string) {
    const next = rows.map((r, i) => (i === rowIndex ? { ...r, [colName]: value } : r));
    onChange(next);
  }

  function addRow() {
    const blank: TableRow = {};
    for (const c of columns) blank[c.name] = "";
    onChange([...rows, blank]);
  }

  function removeRow(rowIndex: number) {
    onChange(rows.filter((_, i) => i !== rowIndex));
  }

  return (
    <div>
      <label className="block text-sm mb-2 font-semibold">{field.label}</label>

      {rows.length === 0 && (
        <div className="panel-flat border-dashed p-4 text-center text-sm text-[var(--muted-soft)] mb-2">
          No rows yet.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="panel-flat p-2.5 flex gap-2 items-start anim-fade-in-up">
            <span className="mono text-xs text-[var(--muted-soft)] pt-2 w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {columns.map((c) => (
                <div key={c.name}>
                  <span className="label-micro block mb-1">{c.label}</span>
                  <input
                    className="field-input mono text-xs py-1.5"
                    placeholder={c.placeholder ?? c.label}
                    value={row[c.name] ?? ""}
                    onChange={(e) => updateCell(i, c.name, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => removeRow(i)}
              aria-label="Remove row"
              className="btn btn-ghost btn-sm mt-5 shrink-0"
              style={{ color: "var(--danger)" }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={addRow} className="mt-2.5" icon={<span>+</span>}>
        Add row
      </Button>
    </div>
  );
}
