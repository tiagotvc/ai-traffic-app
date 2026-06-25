"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { DsButton, DsModal } from "@/design-system";
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

  const atMax = draft.length >= MAX_CHART_METRICS;

  function toggle(key: MetricKey) {
    setDraft((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= MAX_CHART_METRICS ? cur : [...cur, key]
    );
  }

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title={t("metricsModalTitle")}
      subtitle={t("metricsModalHint")}
      width="lg"
      contentClassName="px-5 py-3"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-[var(--text-dim)]">{t("metricsSelected", { count: draft.length })}</span>
          <div className="flex items-center gap-2">
            <DsButton variant="secondary" size="sm" onClick={onClose}>
              {t("cancel")}
            </DsButton>
            <DsButton
              variant="primary"
              size="sm"
              disabled={draft.length === 0}
              onClick={() => onApply(draft)}
            >
              {t("apply")}
            </DsButton>
          </div>
        </div>
      }
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("metricsSearch")}
        className="mb-3 w-full ui-input"
      />
      {METRIC_CATEGORIES.map((cat) =>
        grouped[cat].length ? (
          <div key={cat} className="mb-4 last:mb-0">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {tCat(cat)}
            </div>
            <div className="divide-y divide-[var(--border-color)]">
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
                      className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--ui-accent)] focus:ring-violet-500"
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
    </DsModal>
  );
}
