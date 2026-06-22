"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { cn } from "@/lib/cn";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import {
  barThicknessToSize,
  parseExtendedChartStyle,
  resolveMetricColor,
  strokeWeightToPx,
  type ExtendedChartStyle,
  type SlotVisualConfig
} from "@/lib/dashboard/slot-visual-config";
import type { ChartStyle } from "@/lib/dashboard/widget-config";
import { METRIC_BY_KEY, METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

type ChartPoint = { label: string } & Partial<Record<MetricKey, number>>;

function metricColor(key: MetricKey): string {
  return METRIC_BY_KEY[key]?.color ?? "#94a3b8";
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  metricLabels
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
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
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {metricLabels[entry.dataKey as MetricKey] ?? entry.dataKey}:{" "}
          {formatValue(entry.dataKey as MetricKey, entry.value)}
        </p>
      ))}
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
  title,
  variant = "page",
  chartStyle = "area",
  barLayout = "vertical",
  availableMetrics,
  disableToggle = false,
  previewHeight,
  visual
}: {
  data: ChartPoint[];
  activeMetrics: MetricKey[];
  onToggleMetric?: (key: MetricKey) => void;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
  isLoading?: boolean;
  subtitle?: string;
  title?: string;
  variant?: "page" | "canvas" | "preview" | "embedded";
  chartStyle?: ChartStyle | ExtendedChartStyle;
  barLayout?: ChartBarLayout;
  /** Métricas exibidas nos chips; padrão = catálogo completo. */
  availableMetrics?: MetricKey[];
  disableToggle?: boolean;
  previewHeight?: number;
  visual?: SlotVisualConfig;
}) {
  const t = useTranslations("dashboard");
  const [animKey, setAnimKey] = useState(0);
  const isCanvas = variant === "canvas";
  const isPreview = variant === "preview";
  const isEmbedded = variant === "embedded";

  const toggleKeys = useMemo(
    () => availableMetrics ?? (METRIC_CATALOG.map((m) => m.key) as MetricKey[]),
    [availableMetrics]
  );

  const toggle = (key: MetricKey) => {
    if (disableToggle || !onToggleMetric) return;
    onToggleMetric(key);
    setAnimKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        {!isCanvas && !isPreview && !isEmbedded ? (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="skeleton-shimmer mb-2 h-4 w-40 rounded" />
              <div className="skeleton-shimmer h-3 w-24 rounded" />
            </div>
          </div>
        ) : null}
        <div className="skeleton-shimmer min-h-0 flex-1 rounded-xl" />
      </div>
    );
  }

  const chartHeight = isEmbedded ? undefined : previewHeight ?? (isCanvas ? undefined : 240);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {!isPreview && !isEmbedded ? (
        <div className={cn("flex shrink-0 flex-wrap items-end justify-between gap-2", isCanvas ? "mb-2" : "mb-4")}>
          <div className="min-w-0">
            <h3
              className={cn("font-heading font-semibold", isCanvas ? "text-sm" : "")}
              style={{ color: "var(--text-main)" }}
            >
              {title ?? t("metricsChartTitle")}
            </h3>
            <p className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
              {subtitle ?? t("last30Days")}
            </p>
          </div>
        </div>
      ) : null}

      {!disableToggle ? (
        <div className={cn("mb-2 flex shrink-0 flex-wrap gap-1.5", !isCanvas && !isPreview && !isEmbedded && "mb-3")}>
          {toggleKeys.map((key) => {
            const color = metricColor(key);
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
                        background: `${color}18`,
                        border: `1px solid ${color}45`,
                        color
                      }
                    : { border: "1px solid var(--border-color)", color: "var(--text-dimmer)" }
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: active ? color : "var(--text-dimmer)" }}
                />
                {metricLabels[key] ?? key}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 w-full flex-1",
          isEmbedded && "h-full min-h-[64px]",
          !isCanvas && !isPreview && !isEmbedded && "h-[240px] min-h-[240px] animate-chart-grow"
        )}
        style={chartHeight ? { height: chartHeight, minHeight: chartHeight } : undefined}
        key={animKey}
      >
        {data.length >= 1 ? (
          <ResponsiveContainer width="100%" height={isEmbedded || isCanvas ? "100%" : chartHeight ?? 240}>
            <PerformanceChartBody
              data={data}
              activeMetrics={activeMetrics}
              chartStyle={parseExtendedChartStyle(chartStyle)}
              barLayout={barLayout}
              gradPrefix={`dash-${animKey}`}
              formatValue={formatValue}
              metricLabels={metricLabels}
              visual={visual}
            />
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            {t("noChartData")}
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceChartBody({
  data,
  activeMetrics,
  chartStyle,
  barLayout,
  gradPrefix,
  formatValue,
  metricLabels,
  visual
}: {
  data: ChartPoint[];
  activeMetrics: MetricKey[];
  chartStyle: ExtendedChartStyle;
  barLayout: ChartBarLayout;
  gradPrefix: string;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
  visual?: SlotVisualConfig;
}) {
  const colorFor = (key: MetricKey) => resolveMetricColor(key, visual?.customColors);
  const lineWidth = strokeWeightToPx(visual?.lineStrokeWidth, 2.5);
  const barSize = barThicknessToSize(visual?.barThickness);

  const axisProps = {
    margin: { top: 4, right: 8, left: 0, bottom: 0 } as const,
    data
  };
  const tooltip = (
    <Tooltip content={<CustomTooltip formatValue={formatValue} metricLabels={metricLabels} />} />
  );

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />;
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={{ fill: visual?.textColor ?? "var(--text-dimmer)", fontSize: 10 }}
      axisLine={false}
      tickLine={false}
    />
  );
  const yAxis = (
    <YAxis
      width={44}
      tick={{ fill: visual?.textColor ?? "var(--text-dimmer)", fontSize: 10 }}
      axisLine={false}
      tickLine={false}
    />
  );

  if (chartStyle === "pie" || chartStyle === "donut") {
    const last = data[data.length - 1];
    const pieData = activeMetrics
      .map((key) => ({
        key,
        name: metricLabels[key] ?? key,
        value: Number(last?.[key] ?? 0)
      }))
      .filter((d) => d.value > 0);
    const innerRadius = chartStyle === "donut" ? "52%" : 0;
    return (
      <PieChart>
        <Tooltip
          formatter={(value, name) => {
            const num = Number(value ?? 0);
            const entry = pieData.find((d) => d.name === name);
            return [
              formatValue(entry?.key ?? activeMetrics[0], num),
              String(name ?? "")
            ];
          }}
        />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="78%"
          paddingAngle={2}
        >
          {pieData.map((entry) => (
            <Cell key={entry.key} fill={colorFor(entry.key)} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  if (chartStyle === "radar") {
    const last = data[data.length - 1];
    const radarPoint: ChartPoint = { label: "atual" };
    for (const key of activeMetrics) {
      radarPoint[key] = Number(last?.[key] ?? 0);
    }
    return (
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={[radarPoint]}>
        <PolarGrid stroke="var(--border-color)" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: visual?.textColor ?? "var(--text-dimmer)", fontSize: 9 }}
        />
        <PolarRadiusAxis tick={{ fill: visual?.textColor ?? "var(--text-dimmer)", fontSize: 8 }} />
        <Tooltip />
        {activeMetrics.map((key) => (
          <Radar
            key={key}
            name={metricLabels[key] ?? key}
            dataKey={key}
            stroke={colorFor(key)}
            fill={colorFor(key)}
            fillOpacity={0.25}
            strokeWidth={lineWidth}
          />
        ))}
      </RadarChart>
    );
  }

  if (chartStyle === "bar") {
    const horizontalBars = barLayout === "horizontal";
    return (
      <BarChart
        {...axisProps}
        layout={horizontalBars ? "vertical" : "horizontal"}
        margin={horizontalBars ? { top: 4, right: 8, left: 4, bottom: 0 } : axisProps.margin}
      >
        {grid}
        {horizontalBars ? (
          <>
            <XAxis type="number" tick={{ fill: "var(--text-dimmer)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={56}
              tick={{ fill: "var(--text-dimmer)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            {xAxis}
            {yAxis}
          </>
        )}
        {tooltip}
        {activeMetrics.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colorFor(key)}
            barSize={barSize}
            radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    );
  }

  if (chartStyle === "line") {
    return (
      <LineChart {...axisProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {activeMetrics.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colorFor(key)}
            strokeWidth={lineWidth}
            dot={false}
            activeDot={{ r: 4, fill: colorFor(key), strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    );
  }

  return (
    <AreaChart {...axisProps}>
      <defs>
        {activeMetrics.map((key) => (
          <linearGradient key={key} id={`${gradPrefix}-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorFor(key)} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colorFor(key)} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      {grid}
      {xAxis}
      {yAxis}
      {tooltip}
      {activeMetrics.map((key) => (
        <Area
          key={key}
          type="monotone"
          dataKey={key}
          stroke={colorFor(key)}
          strokeWidth={lineWidth}
          fill={`url(#${gradPrefix}-grad-${key})`}
          dot={false}
          activeDot={{ r: 4, fill: colorFor(key), strokeWidth: 0 }}
        />
      ))}
    </AreaChart>
  );
}
