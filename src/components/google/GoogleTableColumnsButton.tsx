"use client";

import { useCallback, useEffect, useState } from "react";
import { Columns3 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  GOOGLE_PERFORMANCE_COLUMNS,
  GOOGLE_TABLE_DEFAULTS,
  googleTableAvailableColumns,
  normalizeGoogleTableColumns,
  type GoogleTableColumnId,
  type GoogleTableKind
} from "@/lib/google-table-columns";

export function useGoogleTableColumns(kind: GoogleTableKind) {
  const [columns, setColumns] = useState<GoogleTableColumnId[]>(GOOGLE_TABLE_DEFAULTS[kind]);
  useEffect(() => {
    fetch(`/api/settings/google-table-columns?table=${kind}`)
      .then((r) => r.json())
      .then((j) => { if (j.ok) setColumns(normalizeGoogleTableColumns(kind, j.columns)); })
      .catch(() => {});
  }, [kind]);
  return [columns, setColumns] as const;
}

export function GoogleTableColumnsButton({
  kind,
  columns,
  onChange
}: {
  kind: GoogleTableKind;
  columns: GoogleTableColumnId[];
  onChange: (columns: GoogleTableColumnId[]) => void;
}) {
  const t = useTranslations("client");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(columns);
  const [saving, setSaving] = useState(false);
  const available = googleTableAvailableColumns(kind);
  const attributes = available.filter((c) => !GOOGLE_PERFORMANCE_COLUMNS.includes(c as never));
  const performance = available.filter((c) => GOOGLE_PERFORMANCE_COLUMNS.includes(c as never));

  const save = useCallback(async () => {
    if (!draft.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/google-table-columns", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ table: kind, columns: draft })
      });
      const json = await res.json();
      if (json.ok) {
        onChange(normalizeGoogleTableColumns(kind, json.columns));
        setOpen(false);
      }
    } finally { setSaving(false); }
  }, [draft, kind, onChange]);

  const group = (title: string, items: GoogleTableColumnId[]) => (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{title}</div>
      <div className="space-y-1">
        {items.map((column) => (
          <label key={column} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-hover)]">
            <input type="checkbox" checked={draft.includes(column)} onChange={(e) => setDraft((current) => e.target.checked ? [...current, column] : current.filter((c) => c !== column))} />
            {t(`googleColumn_${column}`)}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button type="button" onClick={() => { setDraft(columns); setOpen((v) => !v); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-dim)]">
        <Columns3 className="h-3.5 w-3.5" />{t("googleColumnsButton")}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-xl">
          <div className="font-heading text-sm font-semibold">{t("googleColumnsTitle")}</div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("googleColumnsHint")}</p>
          <div className="mt-3 max-h-[360px] space-y-4 overflow-y-auto">
            {group(t("googleColumnsCategory_attributes"), attributes)}
            {group(t("googleColumnsCategory_performance"), performance)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
            <button type="button" className="text-xs text-[var(--text-dim)]" onClick={() => setDraft([...GOOGLE_TABLE_DEFAULTS[kind]])}>{t("googleColumnsReset")}</button>
            <div className="flex gap-2">
              <button type="button" className="px-2 text-xs text-[var(--text-dim)]" onClick={() => setOpen(false)}>{t("googleColumnsCancel")}</button>
              <button type="button" disabled={!draft.length || saving} className="rounded-lg bg-[var(--ui-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" onClick={() => void save()}>{saving ? t("googleColumnsSaving") : t("googleColumnsSave")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
