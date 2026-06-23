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
  ComposedChart,
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

import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
import { cn } from "@/lib/cn";
import {
  PREMIUM_BAR_RADIUS,
  PREMIUM_CHART_MARGIN,
  premiumActiveDot,
  premiumAreaGradientStops,
  premiumAxisTick,
  premiumGridProps,
  premiumRechartsTooltipProps
} from "@/lib/dashboard/premium-chart-theme";
import {
  toBoxPlotGroups,
  toParetoFromSeries
} from "@/lib/dashboard/chart-distribution";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import { PremiumChartRenderer } from "@/components/dashboard/PremiumChartRenderer";
import {
  barThicknessToSize,
  defaultSeriesStyle,
  parseExtendedChartStyle,
  resolveMetricColor,
  strokeWeightToPx,
  type ExtendedChartStyle,
  type SlotVisualConfig
} from "@/lib/dashboard/slot-visual-config";
import type { ChartStyle } from "@/lib/dashboard/widget-config";
import { METRIC_BY_KEY, METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";

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
    <PremiumChartTooltip title={label}>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {metricLabels[entry.dataKey as MetricKey] ?? entry.dataKey}:{" "}
          {formatValue(entry.dataKey as MetricKey, entry.value)}
        </p>
      ))}
    </PremiumChartTooltip>
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
  visual,
  metricSummary
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
  metricSummary?: Partial<Record<MetricKey, number>>;
}) {
  const t = useTranslations("dashboard");
  const [animKey, setAnimKey] = useState(0);
  const isMobile = useIsMobile();
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

  const chartHeight = isEmbedded ? undefined : previewHeight ?? (isCanvas ? (isMobile ? 240 : undefined) : 280);

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
        <div className={cn("mb-2 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible", !isCanvas && !isPreview && !isEmbedded && "mb-3")}>
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

      <PremiumChartFrame compact={isCanvas || isPreview || isEmbedded}>
        <div
          className={cn(
            "min-h-0 w-full min-w-0 flex-1 overflow-hidden",
            isEmbedded && "h-full min-h-[64px]",
            isCanvas && "min-h-[200px] h-full",
            !isCanvas && !isPreview && !isEmbedded && "h-[280px] min-h-[280px] animate-chart-grow"
          )}
          style={chartHeight ? { height: chartHeight, minHeight: chartHeight } : undefined}
          key={animKey}
        >
          {data.length >= 1 ? (
            <ResponsiveContainer width="100%" height={isEmbedded || isCanvas ? "100%" : chartHeight ?? 280}>
              <PerformanceChartBody
                data={data}
                activeMetrics={activeMetrics}
                chartStyle={parseExtendedChartStyle(chartStyle)}
                barLayout={barLayout}
                gradPrefix={`dash-${animKey}`}
                formatValue={formatValue}
                metricLabels={metricLabels}
                visual={visual}
                metricSummary={metricSummary}
                compactAxis={isMobile}
              />
            </ResponsiveContainer>
          ) : (
            <div
              className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs"
              style={{ borderColor: "var(--chart-frame-border)", color: "var(--text-dim)" }}
            >
              {t("noChartData")}
            </div>
          )}
        </div>
      </PremiumChartFrame>
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
  visual,
  metricSummary,
  compactAxis = false
}: {
  data: ChartPoint[];
  activeMetrics: MetricKey[];
  chartStyle: ExtendedChartStyle;
  barLayout: ChartBarLayout;
  gradPrefix: string;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
  visual?: SlotVisualConfig;
  metricSummary?: Partial<Record<MetricKey, number>>;
  compactAxis?: boolean;
}) {
  const colorFor = (key: MetricKey) => resolveMetricColor(key, visual?.customColors);
  const lineWidth = strokeWeightToPx(visual?.lineStrokeWidth, 2.5);
  const barSize = barThicknessToSize(visual?.barThickness);

  if (chartStyle === "pareto" || chartStyle === "bullet" || chartStyle === "boxplot") {
    const metric = activeMetrics[0] ?? "spend";
    const series = data.map((p) => ({ day: p.label, ...p }));

    if (chartStyle === "pareto") {
      const rows = toParetoFromSeries(
        series as Array<{ day: string } & Partial<Record<MetricKey, number>>>,
        metric,
        visual?.sortDescending !== false
      );
      return (
        <div className="h-full min-h-0 w-full flex-1">
          <PremiumChartRenderer
            chartStyle="pareto"
            paretoRows={rows}
            metricKey={metric}
            formatValue={formatValue}
            visual={visual}
          />
        </div>
      );
    }

    if (chartStyle === "bullet") {
      const current = metricSummary?.[metric] ?? 0;
      const target = visual?.targetValue ?? 0;
      return (
        <div className="h-full min-h-0 w-full flex-1">
          <PremiumChartRenderer
            chartStyle="bullet"
            bulletCurrent={current}
            bulletTarget={target}
            metricKey={metric}
            formatValue={formatValue}
            visual={visual}
            bulletLabel={metricLabels[metric]}
          />
        </div>
      );
    }

    const groupBy = visual?.boxPlotGroupBy ?? "dayOfWeek";
    const groups = toBoxPlotGroups(
      series as Array<{ day: string } & Partial<Record<MetricKey, number>>>,
      groupBy,
      metric
    );
    return (
      <div className="h-full min-h-0 w-full flex-1">
        <PremiumChartRenderer
          chartStyle="boxplot"
          boxPlotGroups={groups}
          metricKey={metric}
          formatValue={formatValue}
          visual={visual}
        />
      </div>
    );
  }

  const axisProps = {
    margin: compactAxis ? { top: 8, right: 8, left: -8, bottom: 0 } : PREMIUM_CHART_MARGIN,
    data
  };
  const tooltip = (
    <Tooltip
      {...premiumRechartsTooltipProps}
      content={<CustomTooltip formatValue={formatValue} metricLabels={metricLabels} />}
    />
  );

  const grid = <CartesianGrid {...premiumGridProps()} />;
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 10 }}
      axisLine={false}
      tickLine={false}
      interval={compactAxis ? "preserveStartEnd" : undefined}
      angle={compactAxis ? -35 : 0}
      textAnchor={compactAxis ? "end" : "middle"}
      height={compactAxis ? 48 : 30}
    />
  );
  const yAxis = (
    <YAxis
      width={compactAxis ? 36 : 44}
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 10 }}
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
          {...premiumRechartsTooltipProps}
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
    const radarData = activeMetrics.map((key) => ({
      metric: metricLabels[key] ?? key,
      value: Number(last?.[key] ?? 0)
    }));
    const maxVal =
      visual?.radarMaxValue ??
      Math.max(...radarData.map((d) => d.value), 1);
    const fillOpacity = visual?.radarFillOpacity ?? 0.25;
    const radarRows = radarData.map((d) => ({ ...d, fullMark: maxVal }));

    return (
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarRows}>
        <PolarGrid stroke="var(--chart-grid)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={premiumAxisTick(visual?.textColor)}
        />
        <PolarRadiusAxis
          domain={[0, maxVal]}
          tick={{ ...premiumAxisTick(visual?.textColor), fontSize: 8 }}
        />
        <Tooltip
          {...premiumRechartsTooltipProps}
          formatter={(value) => {
            const num = Number(value ?? 0);
            return [num.toLocaleString(), ""];
          }}
        />
        <Radar
          name="atual"
          dataKey="value"
          stroke={colorFor(activeMetrics[0])}
          fill={colorFor(activeMetrics[0])}
          fillOpacity={fillOpacity}
          strokeWidth={lineWidth}
        />
      </RadarChart>
    );
  }

  if (chartStyle === "composed") {
    const hasRightAxis = activeMetrics.some(
      (key) => visual?.yAxisSide?.[key] === "right"
    );
    return (
      <ComposedChart {...axisProps}>
        {grid}
        {xAxis}
        {yAxis}
        {hasRightAxis ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            width={44}
            tick={premiumAxisTick(visual?.textColor)}
            axisLine={false}
            tickLine={false}
          />
        ) : null}
        {tooltip}
        {activeMetrics.map((key, index) => {
          const style = visual?.seriesStyles?.[key] ?? defaultSeriesStyle(index);
          const yAxisId = visual?.yAxisSide?.[key] === "right" ? "right" : "left";
          const color = colorFor(key);
          if (style === "bar") {
            return (
              <Bar
                key={key}
                yAxisId={yAxisId}
                dataKey={key}
                fill={color}
                barSize={barSize}
                radius={PREMIUM_BAR_RADIUS.vertical}
              />
            );
          }
          if (style === "line") {
            return (
              <Line
                key={key}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={lineWidth}
                dot={false}
              />
            );
          }
          return (
            <Area
              key={key}
              yAxisId={yAxisId}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={lineWidth}
              fill={`${color}33`}
              dot={false}
            />
          );
        })}
      </ComposedChart>
    );
  }

  if (chartStyle === "bar") {
    const horizontalBars = barLayout === "horizontal";
    return (
      <BarChart
        {...axisProps}
        layout={horizontalBars ? "vertical" : "horizontal"}
        margin={horizontalBars ? { top: 8, right: 12, left: 4, bottom: 4 } : PREMIUM_CHART_MARGIN}
      >
        {grid}
        {horizontalBars ? (
          <>
            <XAxis type="number" tick={premiumAxisTick(visual?.textColor)} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={56}
              tick={{ ...premiumAxisTick(visual?.textColor), fontSize: 9 }}
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
            radius={horizontalBars ? PREMIUM_BAR_RADIUS.horizontal : PREMIUM_BAR_RADIUS.vertical}
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
            activeDot={premiumActiveDot(colorFor(key))}
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
            {premiumAreaGradientStops(colorFor(key)).map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.stopColor} stopOpacity={stop.stopOpacity} />
            ))}
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
          activeDot={premiumActiveDot(colorFor(key))}
        />
      ))}
    </AreaChart>
  );
}
