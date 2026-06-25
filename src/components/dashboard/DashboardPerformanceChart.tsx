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
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { PieLegend } from "@/components/charts/PieLegend";
import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
import { ChartContainer } from "@/components/ui/ChartContainer";
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
      <div className={cn("flex w-full flex-col", !isCanvas && !isPreview && !isEmbedded && "h-full min-h-0")}>
        {!isCanvas && !isPreview && !isEmbedded ? (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="skeleton-shimmer mb-2 h-4 w-40 rounded" />
              <div className="skeleton-shimmer h-3 w-24 rounded" />
            </div>
          </div>
        ) : null}
        <div
          className="skeleton-shimmer rounded-xl"
          style={{ height: isEmbedded ? 120 : isCanvas ? 200 : 280 }}
        />
      </div>
    );
  }

  const resolvedChartHeight = isEmbedded
    ? 120
    : isCanvas
      ? isMobile
        ? 200
        : 220
      : previewHeight ?? 320;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        !isCanvas && !isPreview && !isEmbedded && "h-full min-h-0"
      )}
    >
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

      {disableToggle &&
      visual?.showLegend !== false &&
      activeMetrics.length > 0 &&
      chartStyle !== "pie" &&
      chartStyle !== "donut" ? (
        <div
          className={cn(
            "mb-2 flex shrink-0 flex-wrap gap-3",
            visual?.legendPosition === "top" && "order-first"
          )}
        >
          {activeMetrics.map((key) => {
            const color = resolveMetricColor(key, visual?.customColors);
            const iconShape =
              visual?.legendIconType === "square"
                ? "rounded-sm"
                : visual?.legendIconType === "line"
                  ? "h-0.5 w-3 rounded-none"
                  : "rounded-full";
            return (
              <span key={key} className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                <span className={cn("h-2 w-2 shrink-0", iconShape)} style={{ background: color }} />
                {metricLabels[key] ?? key}
              </span>
            );
          })}
        </div>
      ) : null}

      <PremiumChartFrame compact={isCanvas || isPreview || isEmbedded}>
        {data.length >= 1 ? (
          <ChartContainer
            height={resolvedChartHeight}
            className="w-full animate-chart-grow"
            key={animKey}
          >
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
          </ChartContainer>
        ) : (
          <div
            className="flex items-center justify-center rounded-xl border border-dashed text-xs"
            style={{
              height: resolvedChartHeight,
              borderColor: "var(--chart-frame-border)",
              color: "var(--text-dim)"
            }}
          >
            {t("noChartData")}
          </div>
        )}
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

  // Eixo Y duplo automático: quando há 2+ métricas com escalas muito diferentes,
  // a 1ª fica no eixo esquerdo e as que destoarem por um fator grande vão pro direito.
  // Assim uma métrica de magnitude alta (ex.: Alcance) não esmaga uma de magnitude
  // baixa (ex.: Cliques), que ficaria colada no zero numa escala única.
  const DUAL_AXIS_RATIO = 8;
  const metricMagnitude = (key: MetricKey) => {
    let max = 0;
    for (const point of data) {
      const v = Number(point[key]);
      if (Number.isFinite(v)) max = Math.max(max, Math.abs(v));
    }
    return max;
  };
  const explicitRightAxis = activeMetrics.some((key) => visual?.yAxisSide?.[key] === "right");
  const autoRightAxis = (() => {
    if (explicitRightAxis || activeMetrics.length < 2) return new Set<MetricKey>();
    const baseKey = activeMetrics[0];
    const baseMag = metricMagnitude(baseKey);
    if (baseMag <= 0) return new Set<MetricKey>();
    const right = new Set<MetricKey>();
    for (let i = 1; i < activeMetrics.length; i += 1) {
      const key = activeMetrics[i];
      const mag = metricMagnitude(key);
      if (mag <= 0) continue;
      const ratio = mag > baseMag ? mag / baseMag : baseMag / mag;
      if (ratio >= DUAL_AXIS_RATIO) right.add(key);
    }
    return right;
  })();
  const axisSideFor = (key: MetricKey): "left" | "right" => {
    if (visual?.yAxisSide?.[key] === "right") return "right";
    return autoRightAxis.has(key) ? "right" : "left";
  };
  const hasRightAxis = explicitRightAxis || autoRightAxis.size > 0;

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
    // bottom maior no desktop para os rótulos do eixo X não cortarem embaixo.
    margin: compactAxis ? { top: 8, right: 8, left: -8, bottom: 0 } : { top: 8, right: 12, left: 0, bottom: 12 },
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
      height={compactAxis ? 48 : 36}
      tickMargin={6}
    />
  );
  const yAxis = (
    <YAxis
      yAxisId="left"
      width={compactAxis ? 36 : 44}
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 10 }}
      axisLine={false}
      tickLine={false}
    />
  );
  const rightYAxis = hasRightAxis ? (
    <YAxis
      yAxisId="right"
      orientation="right"
      width={compactAxis ? 36 : 44}
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 10 }}
      axisLine={false}
      tickLine={false}
    />
  ) : null;

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
    const legendItems = pieData.map((entry) => ({
      name: entry.name,
      color: colorFor(entry.key)
    }));
    const showPieLegend = visual?.showLegend !== false;
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        {showPieLegend && visual?.legendPosition === "top" ? (
          <PieLegend items={legendItems} position="top" />
        ) : null}
        <div className="min-h-0 flex-1">
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
        </div>
        {showPieLegend && visual?.legendPosition !== "top" ? (
          <PieLegend items={legendItems} position="bottom" />
        ) : null}
      </div>
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
    return (
      <ComposedChart {...axisProps}>
        {grid}
        {xAxis}
        {yAxis}
        {rightYAxis}
        {tooltip}
        {activeMetrics.map((key, index) => {
          const style = visual?.seriesStyles?.[key] ?? defaultSeriesStyle(index);
          const yAxisId = axisSideFor(key);
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
            {rightYAxis}
          </>
        )}
        {tooltip}
        {activeMetrics.map((key) => (
          <Bar
            key={key}
            yAxisId={horizontalBars ? undefined : axisSideFor(key)}
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
        {rightYAxis}
        {tooltip}
        {activeMetrics.map((key) => (
          <Line
            key={key}
            yAxisId={axisSideFor(key)}
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
      {rightYAxis}
      {tooltip}
      {activeMetrics.map((key) => (
        <Area
          key={key}
          yAxisId={axisSideFor(key)}
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
