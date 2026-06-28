"use client";

import { BarChart2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ReportMetricsModal } from "@/components/reports/ReportMetricsModal";
import type { MetricKey } from "@/lib/dashboard-metrics";

export function ReportMetricPicker({
  selected,
  onChange
}: {
  selected: MetricKey[];
  onChange: (next: MetricKey[]) => void;
}) {
  const t = useTranslations("reports");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-secondary inline-flex items-center gap-1.5 text-xs"
      >
        <BarChart2 size={14} aria-hidden />
        {t("selectMetrics")}
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          style={{
            background: "var(--ui-accent-muted)",
            color: "var(--ui-accent)"
          }}
        >
          {selected.length}
        </span>
      </button>

      <ReportMetricsModal
        open={open}
        selected={selected}
        onClose={() => setOpen(false)}
        onApply={onChange}
      />
    </>
  );
}
