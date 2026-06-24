"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { AlertCardDataPoint } from "@/lib/dashboard/alert-widget-config";

export function AlertMiniChart({
  series,
  comparisonSeries,
  accent,
  threshold,
  height = 120,
  dark = false,
  compact = false
}: {
  series?: AlertCardDataPoint[];
  comparisonSeries?: AlertCardDataPoint[];
  accent: string;
  threshold?: number;
  height?: number;
  dark?: boolean;
  compact?: boolean;
}) {
  const fillId = useId().replace(/:/g, "");
  const data = (series ?? []).map((p, i) => ({
    name: p.date,
    value: p.value,
    compare: comparisonSeries?.[i]?.value
  }));
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg text-xs"
        style={{ height, color: dark ? "#94a3b8" : "var(--text-dim)" }}
      >
        —
      </div>
    );
  }
  const grid = dark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.28)";
  const axisColor = dark ? "#cbd5e1" : "#475569";
  const tickSize = compact ? 10 : 11;
  const yWidth = compact ? 36 : 42;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 6, right: 6, left: 2, bottom: compact ? 0 : 2 }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={dark ? 0.4 : 0.28} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: axisColor, fontSize: tickSize, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={compact ? 16 : 24}
        />
        <YAxis
          tick={{ fill: axisColor, fontSize: tickSize, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          width={yWidth}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Number.isInteger(v) ? String(v) : v.toFixed(1)
          }
        />
        <Tooltip
          contentStyle={{
            background: dark ? "#1e293b" : "#fff",
            border: `1px solid ${accent}44`,
            borderRadius: 8,
            fontSize: 11,
            color: dark ? "#f8fafc" : "#0f172a"
          }}
        />
        {comparisonSeries?.length ? (
          <Line
            type="monotone"
            dataKey="compare"
            stroke={dark ? "#64748b" : "#94a3b8"}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="value"
          stroke={accent}
          fill={`url(#${fillId})`}
          strokeWidth={2}
          dot={false}
        />
        {threshold != null ? (
          <ReferenceLine y={threshold} stroke={accent} strokeDasharray="6 4" strokeOpacity={0.75} />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}
