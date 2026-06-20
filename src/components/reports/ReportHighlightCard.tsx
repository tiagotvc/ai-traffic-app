"use client";

import { Area, AreaChart, Tooltip, XAxis } from "recharts";

import { ChartContainer } from "@/components/ui/ChartContainer";
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
    return <span className="text-[11px] text-slate-400">{noPrevLabel}</span>;
  }
  const up = delta >= 0;
  const color =
    goodWhen === "neutral"
      ? "bg-violet-50 text-violet-700"
      : up === (goodWhen === "up")
        ? "bg-emerald-50 text-emerald-700"
        : "bg-rose-50 text-rose-700";
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
  id,
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
  id: string;
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
  return (
    <div className="ui-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <DeltaBadge delta={delta} goodWhen={goodWhen} locale={locale} noPrevLabel={noPrevLabel} />
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{vsLabel}</div>
      <div className="mt-3 h-16 min-w-0">
        {data.length > 1 ? (
          <ChartContainer height={64}>
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" hide />
              <defs>
                <linearGradient id={`report-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 11
                }}
                labelStyle={{ color: "#64748b" }}
                formatter={(v) => [formatMetricValue(dataKey, Number(v), locale), label]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#report-grad-${id})`}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : null}
      </div>
    </div>
  );
}
