"use client";

import { useTranslations } from "next-intl";

import {
  METRIC_CATALOG,
  METRIC_CATEGORIES,
  type MetricCategory,
  type MetricKey
} from "@/lib/dashboard-metrics";

export function ReportMetricPicker({
  selected,
  onChange
}: {
  selected: MetricKey[];
  onChange: (next: MetricKey[]) => void;
}) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const tCat = useTranslations("metricsCat");

  function toggle(key: MetricKey) {
    onChange(
      selected.includes(key)
        ? selected.length > 1
          ? selected.filter((k) => k !== key)
          : selected
        : [...selected, key]
    );
  }

  const grouped: Record<MetricCategory, typeof METRIC_CATALOG> = {
    performance: [],
    results: [],
    costs: []
  };
  for (const m of METRIC_CATALOG) {
    grouped[m.category].push(m);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">{t("metricsLabel")}</div>
        <button
          type="button"
          onClick={() => onChange(["spend", "clicks", "cpm", "ctr", "conversions"])}
          className="text-[11px] font-medium text-violet-600 hover:underline"
        >
          {t("metricsReset")}
        </button>
      </div>
      {METRIC_CATEGORIES.map((cat) =>
        grouped[cat].length ? (
          <div key={cat}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {tCat(cat)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {grouped[cat].map((m) => {
                const on = selected.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggle(m.key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      on
                        ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tMetrics(m.label)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
