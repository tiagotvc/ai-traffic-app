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
  Legend,
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
import { formatSparkAxisValue } from "@/lib/dashboard/metric-kpi-theme";
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
import { METRIC_BY_KEY, METRIC_CATALOG, MAX_CHART_METRICS, type MetricKey } from "@/lib/dashboard-metrics";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";

type ChartPoint = { label: string } & Partial<Record<MetricKey, number>>;

type MetricScaleGroup = "magnitude" | "percent" | "multiplier";

type AxisSide = "left" | "right" | "tertiary";

const DUAL_AXIS_MAGNITUDE_RATIO = 8;

/** Visual do gráfico de linha no estilo relatório (grid tracejado, legenda, tooltip simples). */
const REPORT_LINE_GRID_STROKE = "var(--border-color)";
const REPORT_LINE_TICK = { fill: "var(--text-dimmer)", fontSize: 10 };
const REPORT_LINE_AXIS = { axisLine: false as const, tickLine: false as const };
const REPORT_LINE_TOOLTIP_STYLE = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  fontSize: 11,
  color: "var(--text-main)"
};

type LineVisual = "report" | "premium";

function metricColor(key: MetricKey): string {
  return METRIC_BY_KEY[key]?.color ?? "#94a3b8";
}

function metricScaleGroup(key: MetricKey): MetricScaleGroup {
  const format = METRIC_BY_KEY[key]?.format;
  if (format === "percent") return "percent";
  if (format === "multiplier" || format === "ratio") return "multiplier";
  return "magnitude";
}

function metricMagnitude(data: ChartPoint[], key: MetricKey): number {
  let max = 0;
  for (const point of data) {
    const v = Number(point[key]);
    if (Number.isFinite(v)) max = Math.max(max, Math.abs(v));
  }
  return max;
}

/** Assign each active metric to left/right/tertiary Y axis by unit group and scale. */
function resolveAxisAssignment(
  activeMetrics: MetricKey[],
  data: ChartPoint[],
  visual: SlotVisualConfig | undefined,
  dualAxisAlways: boolean
): { sides: Map<MetricKey, AxisSide>; hasRightAxis: boolean; hasTertiaryAxis: boolean } {
  const sides = new Map<MetricKey, AxisSide>();
  const unassigned: MetricKey[] = [];

  for (const key of activeMetrics) {
    const explicit = visual?.yAxisSide?.[key];
    if (explicit === "left" || explicit === "right") sides.set(key, explicit);
    else unassigned.push(key);
  }

  const magnitude: MetricKey[] = [];
  const percent: MetricKey[] = [];
  const multiplier: MetricKey[] = [];

  for (const key of unassigned) {
    const group = metricScaleGroup(key);
    if (group === "percent") percent.push(key);
    else if (group === "multiplier") multiplier.push(key);
    else magnitude.push(key);
  }

  magnitude.sort((a, b) => metricMagnitude(data, b) - metricMagnitude(data, a));

  if (activeMetrics.length >= 3) {
    const axes: AxisSide[] = ["left", "right", "tertiary"];
    const buckets: { keys: MetricKey[]; preferred: AxisSide }[] = [
      { keys: magnitude, preferred: "left" },
      { keys: multiplier, preferred: "right" },
      { keys: percent, preferred: "tertiary" }
    ];
    let axisIdx = 0;
    for (const bucket of buckets) {
      if (!bucket.keys.length) continue;
      if (bucket.keys.length === 1) {
        const axis = axes[Math.min(axisIdx, 2)];
        sides.set(bucket.keys[0], axis);
        axisIdx += 1;
        continue;
      }
      for (let i = 0; i < bucket.keys.length; i += 1) {
        sides.set(bucket.keys[i], axes[Math.min(axisIdx + i, 2)]);
      }
      axisIdx += bucket.keys.length;
    }
  } else {
    let rightCandidates: MetricKey[] = [];
    if (multiplier.length > 0) {
      rightCandidates = multiplier;
      magnitude.push(...percent);
    } else if (percent.length > 0) {
      rightCandidates = percent;
    }

    let leftCandidates = [...magnitude];

    if (leftCandidates.length >= 2) {
      const sorted = [...leftCandidates].sort(
        (a, b) => metricMagnitude(data, b) - metricMagnitude(data, a)
      );
      const base = sorted[0];
      const baseMag = metricMagnitude(data, base);
      leftCandidates = [base];
      for (let i = 1; i < sorted.length; i += 1) {
        const key = sorted[i];
        const mag = metricMagnitude(data, key);
        if (baseMag > 0 && mag > 0) {
          const ratio = mag > baseMag ? mag / baseMag : baseMag / mag;
          if (ratio >= DUAL_AXIS_MAGNITUDE_RATIO) rightCandidates.push(key);
          else leftCandidates.push(key);
        } else {
          leftCandidates.push(key);
        }
      }
    }

    for (const key of leftCandidates) sides.set(key, "left");
    for (const key of rightCandidates) sides.set(key, "right");
  }

  if (dualAxisAlways && activeMetrics.length >= 2) {
    const onRight = activeMetrics.filter((k) => sides.get(k) === "right").length;
    const onTertiary = activeMetrics.filter((k) => sides.get(k) === "tertiary").length;
    if (onRight === 0 && onTertiary === 0) {
      const movable = [...activeMetrics]
        .reverse()
        .find((k) => visual?.yAxisSide?.[k] !== "left");
      if (movable) sides.set(movable, "right");
    }
  } else if (activeMetrics.length >= 2 && activeMetrics.length < 3) {
    const rightCandidates = activeMetrics.filter((k) => sides.get(k) === "right");
    const leftCandidates = activeMetrics.filter((k) => sides.get(k) === "left");
    if (rightCandidates.length === 0 && leftCandidates.length >= 2) {
      const baseKey = activeMetrics[0];
      const baseMag = metricMagnitude(data, baseKey);
      if (baseMag > 0) {
        for (let i = 1; i < activeMetrics.length; i += 1) {
          const key = activeMetrics[i];
          if (sides.has(key)) continue;
          const mag = metricMagnitude(data, key);
          if (mag <= 0) continue;
          const ratio = mag > baseMag ? mag / baseMag : baseMag / mag;
          if (ratio >= DUAL_AXIS_MAGNITUDE_RATIO) sides.set(key, "right");
        }
      }
    }
  }

  for (const key of activeMetrics) {
    if (!sides.has(key)) sides.set(key, "left");
  }

  if (dualAxisAlways) {
    for (const key of activeMetrics) {
      if (sides.get(key) === "tertiary") sides.set(key, "right");
    }
    const onLeft = activeMetrics.filter((k) => sides.get(k) === "left");
    if (onLeft.length > 1) {
      const sorted = [...onLeft].sort(
        (a, b) => metricMagnitude(data, b) - metricMagnitude(data, a)
      );
      for (let i = 1; i < sorted.length; i += 1) {
        sides.set(sorted[i]!, "right");
      }
    }
  }

  const hasRightAxis = activeMetrics.some((k) => sides.get(k) === "right");
  const hasTertiaryAxis = dualAxisAlways
    ? false
    : activeMetrics.some((k) => sides.get(k) === "tertiary");

  return { sides, hasRightAxis, hasTertiaryAxis };
}

function yDomainPadding(dataMin: number, dataMax: number): [number, number] {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return [0, 1];
  if (dataMin === dataMax) {
    const pad = dataMax === 0 ? 1 : Math.abs(dataMax) * 0.12 || 1;
    const lo = dataMin >= 0 ? 0 : dataMin - pad;
    return [lo, Math.max(dataMax + pad, pad)];
  }
  const span = dataMax - dataMin;
  const topPad = span * 0.06;
  const lo = dataMin >= 0 ? 0 : dataMin - span * 0.06;
  return [lo, dataMax + topPad];
}

function metricDomain(data: ChartPoint[], keys: MetricKey[]): [number, number] {
  if (keys.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const point of data) {
    for (const key of keys) {
      const v = Number(point[key]);
      if (!Number.isFinite(v)) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  return yDomainPadding(min, max);
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
  metricSummary,
  dualAxisAlways = false,
  fillHeight = false,
  lineVisual = "premium"
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
  /** Always render left + right Y axes (Destaques page). */
  dualAxisAlways?: boolean;
  /** Stretch chart plot to fill remaining card height (Destaques page). */
  fillHeight?: boolean;
  /** Estilo de linha: relatório (limpo) vs premium (área/gradiente). */
  lineVisual?: LineVisual;
}) {
  const t = useTranslations("dashboard");
  const [animKey, setAnimKey] = useState(0);
  const isMobile = useIsMobile();
  const isCanvas = variant === "canvas";
  const isPreview = variant === "preview";
  const isEmbedded = variant === "embedded";
  const isPage = variant === "page";

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
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="skeleton-shimmer mb-1.5 h-3.5 w-36 rounded" />
              <div className="skeleton-shimmer h-2.5 w-20 rounded" />
            </div>
          </div>
        ) : null}
        <div
          className="skeleton-shimmer rounded-lg"
          style={{ height: isEmbedded ? 120 : isCanvas ? 200 : previewHeight ?? 200 }}
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
      : fillHeight
        ? "h-full min-h-[280px]"
        : previewHeight ?? (isPage ? 250 : 200);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        !isCanvas && !isPreview && !isEmbedded && "h-full min-h-0",
        fillHeight && "min-h-0 flex-1"
      )}
    >
      {!isPreview && !isEmbedded ? (
        <div className={cn("flex shrink-0 flex-wrap items-end justify-between gap-2", isCanvas ? "mb-1.5" : "mb-2")}>
          <div className="min-w-0">
            <h3
              className="font-heading text-sm font-semibold text-[var(--text-main)]"
            >
              {title ?? t("metricsChartTitle")}
            </h3>
            <p className="text-[10px]" style={{ color: "var(--text-dimmer)" }}>
              {subtitle ?? t("last30Days")}
            </p>
          </div>
        </div>
      ) : null}

      {!disableToggle ? (
        <div className={cn("mb-1.5 flex shrink-0 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible", !isCanvas && !isPreview && !isEmbedded && "mb-2")}>
          {toggleKeys.map((key) => {
            const color = metricColor(key);
            const active = activeMetrics.includes(key);
            const disabled = !active && activeMetrics.length >= MAX_CHART_METRICS;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => toggle(key)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all",
                  active ? "" : disabled ? "cursor-not-allowed opacity-25" : "opacity-40 hover:opacity-70"
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

      <PremiumChartFrame compact={isCanvas || isPreview || isEmbedded || isPage} className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
        {data.length >= 1 ? (
          <ChartContainer
            height={resolvedChartHeight}
            className={cn("w-full animate-chart-grow", fillHeight && "min-h-[280px] flex-1")}
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
              dualAxisAlways={dualAxisAlways}
              lineVisual={lineVisual}
            />
          </ChartContainer>
        ) : (
          <div
            className="flex items-center justify-center rounded-xl border border-dashed text-xs"
            style={{
              height: typeof resolvedChartHeight === "number" ? resolvedChartHeight : 280,
              borderColor: "var(--chart-frame-border)",
              color: "var(--text-dim)"
            }}
          >
            {t("noChartData")}
          </div>
        )}
      </PremiumChartFrame>

      {isPage && metricSummary && activeMetrics.length > 0 ? (
        <MetricSummaryStrip
          activeMetrics={activeMetrics}
          metricSummary={metricSummary}
          formatValue={formatValue}
          metricLabels={metricLabels}
          className={fillHeight ? "mt-2 shrink-0" : "mt-2"}
        />
      ) : null}
    </div>
  );
}

function MetricSummaryStrip({
  activeMetrics,
  metricSummary,
  formatValue,
  metricLabels,
  className
}: {
  activeMetrics: MetricKey[];
  metricSummary: Partial<Record<MetricKey, number>>;
  formatValue: (key: MetricKey, value: number) => string;
  metricLabels: Record<MetricKey, string>;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", className)}>
      {activeMetrics.map((key) => {
        const value = metricSummary[key];
        if (value === undefined) return null;
        const color = metricColor(key);
        return (
          <div
            key={key}
            className="rounded-lg border px-2.5 py-2"
            style={{
              borderColor: "var(--creator-card-border, var(--border-color))",
              background: "var(--creator-card-bg-inset, var(--surface-bg))"
            }}
          >
            <div className="mb-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-medium text-[var(--text-dimmer)]">
                {metricLabels[key] ?? key}
              </span>
            </div>
            <p className="font-heading text-sm font-bold tabular-nums text-[var(--text-main)]">
              {formatValue(key, value)}
            </p>
          </div>
        );
      })}
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
  compactAxis = false,
  dualAxisAlways = false,
  lineVisual = "premium"
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
  dualAxisAlways?: boolean;
  lineVisual?: LineVisual;
}) {
  const colorFor = (key: MetricKey) => resolveMetricColor(key, visual?.customColors);
  const lineWidth = strokeWeightToPx(visual?.lineStrokeWidth, 2.5);
  const barSize = barThicknessToSize(visual?.barThickness);

  const { sides: axisSides, hasRightAxis, hasTertiaryAxis } = resolveAxisAssignment(
    activeMetrics,
    data,
    visual,
    dualAxisAlways
  );
  const axisSideFor = (key: MetricKey): AxisSide => axisSides.get(key) ?? "left";

  const leftAxisMetrics = activeMetrics.filter((k) => axisSideFor(k) === "left");
  const rightAxisMetrics = activeMetrics.filter((k) => axisSideFor(k) === "right");
  const tertiaryAxisMetrics = activeMetrics.filter((k) => axisSideFor(k) === "tertiary");
  const leftDomain = metricDomain(data, leftAxisMetrics.length ? leftAxisMetrics : activeMetrics);
  const rightDomain =
    rightAxisMetrics.length > 0 ? metricDomain(data, rightAxisMetrics) : leftDomain;
  const tertiaryDomain =
    tertiaryAxisMetrics.length > 0 ? metricDomain(data, tertiaryAxisMetrics) : leftDomain;

  const yAxisWidth = compactAxis ? 36 : dualAxisAlways ? 34 : 44;
  const rightMargin =
    (hasTertiaryAxis ? yAxisWidth * 2 : hasRightAxis ? yAxisWidth : 0) + (compactAxis ? 2 : dualAxisAlways ? 2 : 8);

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
    margin: compactAxis
      ? { top: 6, right: rightMargin, left: 0, bottom: 0 }
      : dualAxisAlways
        ? { top: 4, right: rightMargin, left: 0, bottom: 0 }
        : {
            top: 8,
            right: rightMargin,
            left: 0,
            bottom: hasRightAxis || hasTertiaryAxis ? 4 : 12
          },
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
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 9 }}
      axisLine={false}
      tickLine={false}
      interval={compactAxis ? "preserveStartEnd" : dualAxisAlways ? "preserveStartEnd" : undefined}
      angle={compactAxis ? -35 : 0}
      textAnchor={compactAxis ? "end" : "middle"}
      height={compactAxis ? 40 : dualAxisAlways ? 22 : 36}
      tickMargin={dualAxisAlways ? 2 : 4}
    />
  );
  const yAxis = (
    <YAxis
      yAxisId="left"
      width={yAxisWidth}
      tick={{ ...premiumAxisTick(visual?.textColor), fontSize: compactAxis ? 8 : 9 }}
      axisLine={false}
      tickLine={false}
      domain={leftDomain}
      tickCount={dualAxisAlways ? 4 : undefined}
      allowDataOverflow={false}
      tickFormatter={(v: number) => formatSparkAxisValue(Number(v))}
    />
  );
  const rightYAxis = hasRightAxis ? (
    <YAxis
      yAxisId="right"
      orientation="right"
      width={yAxisWidth}
      tick={{
        ...premiumAxisTick(visual?.textColor),
        fontSize: compactAxis ? 8 : 9,
        fill: visual?.textColor ?? "var(--chart-tick-muted, var(--text-dimmer))"
      }}
      axisLine={false}
      tickLine={false}
      domain={rightDomain}
      tickCount={dualAxisAlways ? 4 : undefined}
      allowDataOverflow={false}
      tickFormatter={(v: number) => {
        const primaryRight = rightAxisMetrics[0];
        if (primaryRight) return formatValue(primaryRight, Number(v));
        return formatSparkAxisValue(Number(v));
      }}
    />
  ) : null;
  const tertiaryYAxis = hasTertiaryAxis ? (
    <YAxis
      yAxisId="tertiary"
      orientation="right"
      width={yAxisWidth}
      tick={{
        ...premiumAxisTick(visual?.textColor),
        fontSize: compactAxis ? 8 : 9,
        fill: visual?.textColor ?? "var(--chart-tick-muted, var(--text-dimmer))"
      }}
      axisLine={false}
      tickLine={false}
      domain={tertiaryDomain}
      tickCount={dualAxisAlways ? 4 : undefined}
      allowDataOverflow={false}
      tickFormatter={(v: number) => {
        const primaryTertiary = tertiaryAxisMetrics[0];
        if (primaryTertiary) return formatValue(primaryTertiary, Number(v));
        return formatSparkAxisValue(Number(v));
      }}
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
        {tertiaryYAxis}
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
        {tertiaryYAxis}
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
    if (lineVisual === "report") {
      const reportLeftYAxisWidth = 44;
      const reportRightYAxisWidth = 32;
      const reportRightMargin = hasTertiaryAxis
        ? reportRightYAxisWidth * 2
        : hasRightAxis
          ? reportRightYAxisWidth
          : 0;
      const reportAxisProps = {
        margin: { top: 8, right: reportRightMargin, left: 0, bottom: 0 },
        data
      };
      const reportGrid = (
        <CartesianGrid strokeDasharray="3 3" stroke={REPORT_LINE_GRID_STROKE} />
      );
      const reportXAxis = (
        <XAxis
          dataKey="label"
          tick={REPORT_LINE_TICK}
          {...REPORT_LINE_AXIS}
          interval="preserveStartEnd"
          height={28}
          tickMargin={4}
        />
      );
      const reportLeftYAxis = (
        <YAxis
          yAxisId="left"
          width={reportLeftYAxisWidth}
          tick={REPORT_LINE_TICK}
          {...REPORT_LINE_AXIS}
          domain={leftDomain}
          tickCount={dualAxisAlways ? 5 : undefined}
          allowDataOverflow={false}
          tickFormatter={(v: number) => formatSparkAxisValue(Number(v))}
        />
      );
      const reportRightYAxis = hasRightAxis ? (
        <YAxis
          yAxisId="right"
          orientation="right"
          width={reportRightYAxisWidth}
          tick={{ ...REPORT_LINE_TICK, textAnchor: "start" as const }}
          {...REPORT_LINE_AXIS}
          domain={rightDomain}
          tickCount={dualAxisAlways ? 5 : undefined}
          allowDataOverflow={false}
          tickFormatter={(v: number) => {
            const primaryRight = rightAxisMetrics[0];
            if (primaryRight) return formatValue(primaryRight, Number(v));
            return formatSparkAxisValue(Number(v));
          }}
        />
      ) : null;
      const reportTertiaryYAxis = hasTertiaryAxis ? (
        <YAxis
          yAxisId="tertiary"
          orientation="right"
          width={reportRightYAxisWidth}
          tick={{ ...REPORT_LINE_TICK, textAnchor: "start" as const }}
          {...REPORT_LINE_AXIS}
          domain={tertiaryDomain}
          tickCount={dualAxisAlways ? 5 : undefined}
          allowDataOverflow={false}
          tickFormatter={(v: number) => {
            const primaryTertiary = tertiaryAxisMetrics[0];
            if (primaryTertiary) return formatValue(primaryTertiary, Number(v));
            return formatSparkAxisValue(Number(v));
          }}
        />
      ) : null;
      const reportTooltip = (
        <Tooltip
          contentStyle={REPORT_LINE_TOOLTIP_STYLE}
          formatter={(value, _name, item) => {
            const key = String((item as { dataKey?: string })?.dataKey ?? "") as MetricKey;
            return [formatValue(key, Number(value)), metricLabels[key] ?? key];
          }}
        />
      );

      return (
        <LineChart {...reportAxisProps}>
          {reportGrid}
          {reportXAxis}
          {reportLeftYAxis}
          {reportRightYAxis}
          {reportTertiaryYAxis}
          {reportTooltip}
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-dim)", paddingLeft: 0, paddingRight: 0 }}
          />
          {activeMetrics.map((key) => (
            <Line
              key={key}
              yAxisId={axisSideFor(key)}
              type="monotone"
              dataKey={key}
              name={metricLabels[key] ?? key}
              stroke={colorFor(key)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      );
    }

    return (
      <LineChart {...axisProps}>
        {grid}
        {xAxis}
        {yAxis}
        {rightYAxis}
        {tertiaryYAxis}
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
      {tertiaryYAxis}
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
