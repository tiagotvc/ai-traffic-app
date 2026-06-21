"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { cn } from "@/lib/cn";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

type ChartPoint = { label: string } & Partial<Record<MetricKey, number>>;

const metricConfig: Partial<Record<MetricKey, { label: string; color: string }>> = {
  spend: { label: "Spend (R$)", color: "#f5a623" },
  cpa: { label: "CPL (R$)", color: "#4f46e5" },
  roas: { label: "ROAS", color: "#10b981" },
  ctr: { label: "CTR (%)", color: "#7c3aed" }
};

function CustomTooltip({
  active,
  payload,
  label,
  formatValue
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  formatValue: (key: MetricKey, value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-2xl"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-hover)",
        color: "var(--text-main)"
      }}
    >
      <p className="mb-2 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
        {label}
      </p>
      {payload.map((entry) => {
        const cfg = metricConfig[entry.dataKey as MetricKey];
        return (
          <p key={entry.dataKey} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {cfg?.label}: {formatValue(entry.dataKey as MetricKey, entry.value)}
          </p>
        );
      })}
    </div>
  );
}

export function DashboardPerformanceChart({
  data,
  activeMetrics,
  onToggleMetric,
  formatValue,
  metricLabels,
  isLoading,
  subtitle,
  title
}: {
  data: ChartPoint[];
  activeMetrics: MetricKey[];
  onToggleMetric: (key: MetricKey) => void;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
  isLoading?: boolean;
  subtitle?: string;
  title?: string;
}) {
  const t = useTranslations("dashboard");
  const [animKey, setAnimKey] = useState(0);

  const toggle = (key: MetricKey) => {
    onToggleMetric(key);
    setAnimKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="skeleton-shimmer mb-2 h-4 w-40 rounded" />
            <div className="skeleton-shimmer h-3 w-24 rounded" />
          </div>
        </div>
        <div className="skeleton-shimmer flex-1 rounded-xl" />
      </div>
    );
  }

  const keys = (Object.keys(metricConfig) as MetricKey[]).filter((k) => metricConfig[k]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
            {title ?? t("metricsChartTitle")}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-dimmer)" }}>
            {subtitle ?? t("last30Days")}
          </p>
        </div>
      </div>

      <div className="mb-3 flex shrink-0 flex-wrap gap-1.5">
        {keys.map((key) => {
          const cfg = metricConfig[key]!;
          const active = activeMetrics.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                active ? "" : "opacity-40 hover:opacity-70"
              )}
              style={
                active
                  ? {
                      background: `${cfg.color}18`,
                      border: `1px solid ${cfg.color}45`,
                      color: cfg.color
                    }
                  : { border: "1px solid var(--border-color)", color: "var(--text-dimmer)" }
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: active ? cfg.color : "var(--text-dimmer)" }}
              />
              {metricLabels[key] ?? cfg.label}
            </button>
          );
        })}
      </div>

      <div className="h-[240px] min-h-[240px] animate-chart-grow" key={animKey}>
        {data.length >= 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                {keys.map((key) => {
                  const cfg = metricConfig[key]!;
                  return (
                    <linearGradient key={key} id={`dash-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-dimmer)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-dimmer)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip formatValue={formatValue} />
                }
              />
              {activeMetrics.map((key) => {
                const cfg = metricConfig[key];
                if (!cfg) return null;
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={cfg.color}
                    strokeWidth={2.5}
                    fill={`url(#dash-grad-${key})`}
                    dot={false}
                    activeDot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            Sem dados
          </div>
        )}
      </div>
    </div>
  );
}
