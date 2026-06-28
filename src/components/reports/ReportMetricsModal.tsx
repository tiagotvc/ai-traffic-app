"use client";

import { BarChart2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MultiSelectChoiceCard } from "@/components/campaign-creator/BudgetChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

const DEFAULT_METRICS: MetricKey[] = ["spend", "clicks", "cpm", "ctr", "conversions"];

type Props = {
  open: boolean;
  selected: MetricKey[];
  onClose: () => void;
  onApply: (next: MetricKey[]) => void;
};

export function ReportMetricsModal({ open, selected, onClose, onApply }: Props) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const [draft, setDraft] = useState<MetricKey[]>(selected);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  function toggle(value: MetricKey) {
    setDraft((cur) => {
      if (cur.includes(value)) {
        if (cur.length <= 1) return cur;
        return cur.filter((v) => v !== value);
      }
      return [...cur, value];
    });
  }

  function isDefaultSelection(keys: MetricKey[]) {
    return (
      keys.length === DEFAULT_METRICS.length &&
      DEFAULT_METRICS.every((k) => keys.includes(k))
    );
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("metricsModalTitle")}
      subtitle={t("metricsModalHint")}
      titleIcon={<BarChart2 size={16} />}
      width="lg"
      onCancel={onClose}
      onClear={() => setDraft(DEFAULT_METRICS)}
      clearDisabled={isDefaultSelection(draft)}
      onPrimary={handleApply}
      primaryLabel={t("metricsModalApply")}
      primaryDisabled={draft.length === 0}
    >
      <p className="mb-2 text-xs text-[var(--text-dim)]">
        {t("metricsSelected", { count: draft.length })}
      </p>
      <div className="flex flex-wrap gap-2">
        {METRIC_CATALOG.map((m) => (
          <MultiSelectChoiceCard
            key={m.key}
            selected={draft.includes(m.key)}
            label={tMetrics(m.label)}
            size="sm"
            onToggle={() => toggle(m.key)}
          />
        ))}
      </div>
    </CreatorModalShell>
  );
}
