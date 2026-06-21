"use client";

import { useTranslations } from "next-intl";

import { DsSelectablePills } from "@/design-system";
import {
  METRIC_CATALOG,
  type MetricKey
} from "@/lib/dashboard-metrics";

export function ReportMetricPicker({
  selected,
  onChange,
  compact = false
}: {
  selected: MetricKey[];
  onChange: (next: MetricKey[]) => void;
  compact?: boolean;
}) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");

  const options = METRIC_CATALOG.map((m) => ({
    value: m.key,
    label: tMetrics(m.label)
  }));

  if (compact) {
    return (
      <DsSelectablePills
        options={options}
        selected={selected}
        onChange={onChange}
        minSelected={1}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-[var(--text-dim)]">{t("metricsLabel")}</div>
        <button
          type="button"
          onClick={() => onChange(["spend", "clicks", "cpm", "ctr", "conversions"])}
          className="ui-link text-[11px]"
        >
          {t("metricsReset")}
        </button>
      </div>
      <DsSelectablePills options={options} selected={selected} onChange={onChange} minSelected={1} />
    </div>
  );
}
