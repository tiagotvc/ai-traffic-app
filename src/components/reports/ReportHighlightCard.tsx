"use client";

import { MiniSparkline } from "@/components/ui/MiniSparkline";
import { formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { formatPercent } from "@/lib/format";

function DeltaBadge({
  delta,
  goodWhen,
  locale,
  noPrevLabel
}: {
  delta: number | null;
  goodWhen: "up" | "neutral";
  locale: string;
  noPrevLabel: string;
}) {
  if (delta === null) {
    return <span className="text-[11px] text-[var(--text-dimmer)]">{noPrevLabel}</span>;
  }
  const up = delta >= 0;
  const positive =
    goodWhen === "neutral" ? null : up === (goodWhen === "up");
  const color =
    goodWhen === "neutral"
      ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
      : positive
        ? "bg-[rgba(16,185,129,0.12)] text-[var(--success)]"
        : "bg-[rgba(239,68,68,0.12)] text-[var(--danger)]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      <span className="leading-none">{up ? "▲" : "▼"}</span>
      {formatPercent(Math.abs(delta), 1, locale)}
    </span>
  );
}

export function ReportHighlightCard({
  label,
  value,
  delta,
  goodWhen,
  data,
  dataKey,
  color,
  vsLabel,
  noPrevLabel,
  locale
}: {
  id?: string;
  label: string;
  value: string;
  delta: number | null;
  goodWhen: "up" | "neutral";
  data: Array<{ label: string } & Record<string, number | string | undefined>>;
  dataKey: MetricKey;
  color: string;
  vsLabel: string;
  noPrevLabel: string;
  locale: string;
}) {
  const sparkPoints = data.map((row) => Number(row[dataKey] ?? 0));

  return (
    <div
      className="campaign-creator-card report-pdf-kpi report-pdf-block flex min-w-0 flex-col overflow-hidden !p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {label}
        </div>
        <DeltaBadge delta={delta} goodWhen={goodWhen} locale={locale} noPrevLabel={noPrevLabel} />
      </div>
      <div className="font-heading mt-1 truncate text-2xl font-bold tracking-tight text-[var(--text-main)]">
        {value}
      </div>
      <div className="truncate text-[9px] text-[var(--text-dimmer)]">{vsLabel}</div>
      <div className="campaign-creator-sidebar-card-inset report-kpi-spark mt-3 w-full shrink-0 rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1">
        {sparkPoints.length > 1 ? (
          <MiniSparkline points={sparkPoints} color={color} height={56} fullWidth />
        ) : null}
      </div>
    </div>
  );
}
