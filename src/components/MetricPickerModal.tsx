"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  MAX_CHART_METRICS,
  METRIC_CATALOG,
  METRIC_CATEGORIES,
  type MetricCategory,
  type MetricKey
} from "@/lib/dashboard-metrics";

export function MetricPickerModal({
  open,
  selected,
  onApply,
  onClose
}: {
  open: boolean;
  selected: MetricKey[];
  onApply: (next: MetricKey[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard");
  const tMetrics = useTranslations("metrics");
  const tCat = useTranslations("metricsCat");
  const [draft, setDraft] = useState<MetricKey[]>(selected);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery("");
    }
  }, [open, selected]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Record<MetricCategory, typeof METRIC_CATALOG> = {
      performance: [],
      results: [],
      costs: []
    };
    for (const m of METRIC_CATALOG) {
      if (q && !tMetrics(m.label).toLowerCase().includes(q)) continue;
      out[m.category].push(m);
    }
    return out;
  }, [query, tMetrics]);

  if (!open) return null;

  const atMax = draft.length >= MAX_CHART_METRICS;

  function toggle(key: MetricKey) {
    setDraft((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= MAX_CHART_METRICS ? cur : [...cur, key]
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("metricsModalTitle")}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("metricsModalHint")}</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("metricsSearch")}
            className="mt-3 w-full ui-input"
          />
        </div>

        {/* Body: categorized list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {METRIC_CATEGORIES.map((cat) =>
            grouped[cat].length ? (
              <div key={cat} className="mb-4 last:mb-0">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {tCat(cat)}
                </div>
                <div className="divide-y divide-slate-50">
                  {grouped[cat].map((m) => {
                    const checked = draft.includes(m.key);
                    const disabled = !checked && atMax;
                    return (
                      <label
                        key={m.key}
                        className={`flex cursor-pointer items-center gap-3 py-2 ${
                          disabled ? "cursor-not-allowed opacity-40" : "hover:bg-[var(--surface-bg)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(m.key)}
                          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--violet)] focus:ring-violet-500"
                        />
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: m.color }}
                        />
                        <span className="text-sm text-[var(--text-dim)]">{tMetrics(m.label)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-5 py-3">
          <span className="text-xs text-[var(--text-dim)]">{t("metricsSelected", { count: draft.length })}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="ui-btn-primary"
              disabled={draft.length === 0}
              onClick={() => onApply(draft)}
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
