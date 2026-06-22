"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { BoxPlotGroup, ParetoRow } from "@/lib/dashboard/chart-distribution";
import { resolveMetricColor, type SlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import type { MetricKey } from "@/lib/dashboard-metrics";

type FormatFn = (key: MetricKey, value: number) => string;

function ChartShell({
  children,
  empty
}: {
  children?: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs"
        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
      >
        —
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  );
}

export function ParetoChart({
  rows,
  metricKey,
  formatValue,
  visual
}: {
  rows: ParetoRow[];
  metricKey: MetricKey;
  formatValue: FormatFn;
  visual?: SlotVisualConfig;
}) {
  const color = resolveMetricColor(metricKey, visual?.customColors);
  const lineColor = visual?.paretoCumulativeLineColor ?? "#d97706";

  return (
    <ChartShell empty={!rows.length}>
      <ComposedChart data={rows} margin={{ top: 6, right: 12, left: 4, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: visual?.textColor ?? "#64748b", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: visual?.textColor ?? "#64748b", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatValue(metricKey, Number(v))}
          width={48}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: visual?.textColor ?? "#64748b", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <Tooltip
          formatter={(value, name) => {
            const num = Number(value ?? 0);
            if (name === "Cum. %" || name === "cumulativePct") return [`${num.toFixed(1)}%`, "Cum. %"];
            return [formatValue(metricKey, num), metricKey];
          }}
        />
        <Bar yAxisId="left" dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulativePct"
          name="Cum. %"
          stroke={lineColor}
          strokeWidth={2.5}
          dot={{ r: 2, fill: lineColor, strokeWidth: 0 }}
          activeDot={{ r: 3 }}
        />
      </ComposedChart>
    </ChartShell>
  );
}

export function BulletChart({
  current,
  target,
  metricKey,
  formatValue,
  visual,
  label
}: {
  current: number;
  target: number;
  metricKey: MetricKey;
  formatValue: FormatFn;
  visual?: SlotVisualConfig;
  label?: string;
}) {
  const color = resolveMetricColor(metricKey, visual?.customColors);
  const zones = visual?.rangeZones ?? [];
  const maxVal = Math.max(current, target, ...zones.map((z) => z.max), 1);

  const barData = useMemo(
    () => [{ name: label ?? "metric", current, target, max: maxVal }],
    [label, current, target, maxVal]
  );

  return (
    <ChartShell empty={current <= 0 && target <= 0}>
      <ComposedChart layout="vertical" data={barData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <XAxis type="number" domain={[0, maxVal]} hide />
        <YAxis type="category" dataKey="name" hide />
        {zones.map((zone, i) => (
          <ReferenceLine
            key={`zone-${i}`}
            x={zone.max}
            stroke={zone.color}
            strokeDasharray="4 4"
            label={zone.label ? { value: zone.label, position: "top", fontSize: 8 } : undefined}
          />
        ))}
        <ReferenceLine x={target} stroke="#94a3b8" strokeWidth={2} label={{ value: "Target", fontSize: 8 }} />
        <Tooltip formatter={(v) => formatValue(metricKey, Number(v ?? 0))} />
        <Bar dataKey="current" fill={color} barSize={24} radius={[0, 4, 4, 0]} background={{ fill: "var(--surface-bg)" }} />
      </ComposedChart>
    </ChartShell>
  );
}

function BoxPlotSvg({
  groups,
  formatValue,
  metricKey,
  color
}: {
  groups: BoxPlotGroup[];
  formatValue: FormatFn;
  metricKey: MetricKey;
  color: string;
}) {
  const padding = { top: 12, right: 8, bottom: 28, left: 44 };
  const width = 100;
  const height = 100;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const allValues = groups.flatMap((g) => [g.min, g.max, ...g.outliers]);
  const yMin = Math.min(...allValues, 0);
  const yMax = Math.max(...allValues, 1);
  const yScale = (v: number) => padding.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const step = groups.length ? plotW / groups.length : plotW;
  const boxW = Math.min(step * 0.5, 12);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + plotH * (1 - t);
        const val = yMin + (yMax - yMin) * t;
        return (
          <g key={t}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--border-color)" strokeDasharray="2 2" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize="3" fill="var(--text-dimmer)">
              {formatValue(metricKey, val).replace(/\s/g, "")}
            </text>
          </g>
        );
      })}
      {groups.map((g, i) => {
        const cx = padding.left + step * i + step / 2;
        const whiskerTop = yScale(g.max);
        const whiskerBot = yScale(g.min);
        const q1y = yScale(g.q1);
        const q3y = yScale(g.q3);
        const medY = yScale(g.median);
        return (
          <g key={g.label}>
            <line x1={cx} x2={cx} y1={whiskerTop} y2={q3y} stroke={color} strokeWidth="0.4" />
            <line x1={cx} x2={cx} y1={q1y} y2={whiskerBot} stroke={color} strokeWidth="0.4" />
            <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={whiskerTop} y2={whiskerTop} stroke={color} strokeWidth="0.4" />
            <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={whiskerBot} y2={whiskerBot} stroke={color} strokeWidth="0.4" />
            <rect
              x={cx - boxW / 2}
              y={q3y}
              width={boxW}
              height={Math.max(q1y - q3y, 0.5)}
              fill={`${color}33`}
              stroke={color}
              strokeWidth="0.4"
            />
            <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={medY} y2={medY} stroke={color} strokeWidth="0.6" />
            {g.outliers.map((o, oi) => (
              <circle key={oi} cx={cx} cy={yScale(o)} r="0.8" fill={color} opacity={0.7} />
            ))}
            <text x={cx} y={height - 6} textAnchor="middle" fontSize="3" fill="var(--text-dimmer)">
              {g.label.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BoxPlotChart({
  groups,
  metricKey,
  formatValue,
  visual
}: {
  groups: BoxPlotGroup[];
  metricKey: MetricKey;
  formatValue: FormatFn;
  visual?: SlotVisualConfig;
}) {
  const color = resolveMetricColor(metricKey, visual?.customColors);

  if (!groups.length) {
    return <ChartShell empty />;
  }

  return (
    <div className="h-full min-h-0 w-full flex-1">
      <BoxPlotSvg groups={groups} formatValue={formatValue} metricKey={metricKey} color={color} />
    </div>
  );
}

export function PremiumChartRenderer({
  chartStyle,
  paretoRows,
  boxPlotGroups,
  bulletCurrent,
  bulletTarget,
  metricKey,
  formatValue,
  visual,
  bulletLabel
}: {
  chartStyle: "pareto" | "bullet" | "boxplot";
  paretoRows?: ParetoRow[];
  boxPlotGroups?: BoxPlotGroup[];
  bulletCurrent?: number;
  bulletTarget?: number;
  metricKey: MetricKey;
  formatValue: FormatFn;
  visual?: SlotVisualConfig;
  bulletLabel?: string;
}) {
  if (chartStyle === "pareto") {
    return (
      <ParetoChart rows={paretoRows ?? []} metricKey={metricKey} formatValue={formatValue} visual={visual} />
    );
  }
  if (chartStyle === "bullet") {
    return (
      <BulletChart
        current={bulletCurrent ?? 0}
        target={bulletTarget ?? visual?.targetValue ?? 0}
        metricKey={metricKey}
        formatValue={formatValue}
        visual={visual}
        label={bulletLabel}
      />
    );
  }
  return (
    <BoxPlotChart
      groups={boxPlotGroups ?? []}
      metricKey={metricKey}
      formatValue={formatValue}
      visual={visual}
    />
  );
}
