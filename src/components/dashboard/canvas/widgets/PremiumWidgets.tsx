"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PremiumChartRenderer } from "@/components/dashboard/PremiumChartRenderer";
import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { PerformanceChartWidget } from "@/components/dashboard/canvas/widgets/LegacyWidgets";
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import {
  premiumAxisTick,
  premiumGridProps,
  premiumRechartsTooltipProps
} from "@/lib/dashboard/premium-chart-theme";
import {
  toBoxPlotGroups,
  toParetoFromSeries
} from "@/lib/dashboard/chart-distribution";
import type { CellScale, HeatmapColorScale, SlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { formatDayLabel } from "@/lib/dashboard-ranges";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;
type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

const POINT_RADIUS = { small: 4, medium: 6, large: 9 } as const;

const CELL_MIN_HEIGHT: Record<CellScale, number> = {
  auto: 52,
  compact: 40,
  large: 68
};

function intensityForValue(value: number, max: number, scale: HeatmapColorScale | undefined): number {
  if (max <= 0) return 0;
  const ratio = value / max;
  if (scale === "log") {
    return Math.log1p(value) / Math.log1p(max);
  }
  return ratio;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom ? num / denom : 0;
}

export function HeatmapWidget({
  data,
  heatmapMetric = "spend",
  cellScale = "auto",
  heatmapColorScale = "auto",
  visual
}: {
  data: DashboardData;
  heatmapMetric?: MetricKey;
  cellScale?: CellScale;
  heatmapColorScale?: HeatmapColorScale;
  visual?: SlotVisualConfig;
}) {
  const t = useTranslations("dashboardWidgets");
  const locale = useLocale();
  const resolvedVisual = visual ?? {};
  const scale = heatmapColorScale ?? resolvedVisual.heatmapColorScale ?? "auto";
  const cellSize = cellScale ?? resolvedVisual.cellScale ?? "auto";
  const minCellH = CELL_MIN_HEIGHT[cellSize];

  const { cells, max, total, avg } = useMemo(() => {
    const series = data.series as SeriesPoint[];
    const values = series.map((p) => p[heatmapMetric] ?? 0);
    const maxVal = Math.max(...values, 1);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      cells: series.map((p) => {
        const value = p[heatmapMetric] ?? 0;
        return {
          day: p.day,
          label: formatDayLabel(p.day, locale),
          value,
          intensity: intensityForValue(value, maxVal, scale === "auto" ? "linear" : scale)
        };
      }),
      max: maxVal,
      total: sum,
      avg: values.length ? sum / values.length : 0
    };
  }, [data.series, heatmapMetric, locale, scale]);

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-xl" />;
  }

  if (!cells.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-dim)]">
        {t("heatmapNoData")}
      </div>
    );
  }

  const color = METRIC_BY_KEY[heatmapMetric]?.color ?? "#7c3aed";
  const cols = Math.min(cells.length, 14);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-0.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap gap-2 text-[9px] tabular-nums text-[var(--text-dim)]">
          <span>
            {t("heatmapMax")}: {data.formatMetricValue(heatmapMetric, max)}
          </span>
          <span>
            {t("heatmapAvg")}: {data.formatMetricValue(heatmapMetric, avg)}
          </span>
          <span>
            {t("heatmapTotal")}: {data.formatMetricValue(heatmapMetric, total)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="grid min-w-full gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))` }}
        >
          {cells.map((c) => {
            const intense = c.intensity > 0.55;
            return (
              <div key={c.day} className="flex min-w-0 flex-col items-stretch gap-1">
                <div
                  className="flex flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center transition-transform hover:scale-[1.02]"
                  style={{
                    minHeight: minCellH,
                    borderColor: `${color}33`,
                    background: `color-mix(in srgb, ${color} ${Math.round(12 + c.intensity * 68)}%, var(--surface-bg))`,
                    color: intense ? "#fff" : "var(--text-main)"
                  }}
                  title={`${c.label} — ${data.formatMetricValue(heatmapMetric, c.value)}`}
                >
                  <span className="text-[10px] font-bold leading-tight tabular-nums">
                    {data.formatMetricValue(heatmapMetric, c.value)}
                  </span>
                </div>
                <span className="truncate text-center text-[8px] font-medium text-[var(--text-dimmer)]">
                  {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[8px] text-[var(--text-dimmer)]">{t("heatmapLow")}</span>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 15%, transparent), ${color})`
          }}
        />
        <span className="text-[8px] text-[var(--text-dimmer)]">{t("heatmapHigh")}</span>
      </div>
    </div>
  );
}

export function ScatterWidget({
  data,
  metricX = "spend",
  metricY = "roas",
  pointSize = "medium"
}: {
  data: DashboardData;
  metricX?: MetricKey;
  metricY?: MetricKey;
  pointSize?: "small" | "medium" | "large";
}) {
  const tMetrics = useTranslations("metrics");

  const points = useMemo(() => {
    return (data.series as SeriesPoint[])
      .map((p) => ({
        x: p[metricX] ?? 0,
        y: p[metricY] ?? 0,
        label: p.day
      }))
      .filter((p) => p.x > 0 || p.y > 0);
  }, [data.series, metricX, metricY]);

  const color = METRIC_BY_KEY[metricX]?.color ?? "#6366f1";

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-xl" />;
  }

  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-dim)]">
        —
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-1">
      <div className="flex justify-between gap-2 text-[9px] text-[var(--text-dimmer)]">
        <span className="truncate">{tMetrics(METRIC_BY_KEY[metricX]?.label ?? metricX)}</span>
        <span className="truncate">{tMetrics(METRIC_BY_KEY[metricY]?.label ?? metricY)}</span>
      </div>
      <ChartContainer height={180} className="w-full">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid {...premiumGridProps()} />
            <XAxis
              type="number"
              dataKey="x"
              tick={{ ...premiumAxisTick(), fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => data.formatMetricValue(metricX, Number(v))}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ ...premiumAxisTick(), fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => data.formatMetricValue(metricY, Number(v))}
            />
            <ZAxis type="number" range={[POINT_RADIUS[pointSize], POINT_RADIUS[pointSize]]} />
            <Tooltip
              {...premiumRechartsTooltipProps}
              cursor={{ strokeDasharray: "3 3", stroke: "var(--chart-grid)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as { x: number; y: number; label: string };
                return (
                  <PremiumChartTooltip title={formatDayLabel(row.label, data.locale)}>
                    <p>
                      {tMetrics(METRIC_BY_KEY[metricX]?.label ?? metricX)}:{" "}
                      {data.formatMetricValue(metricX, row.x)}
                    </p>
                    <p>
                      {tMetrics(METRIC_BY_KEY[metricY]?.label ?? metricY)}:{" "}
                      {data.formatMetricValue(metricY, row.y)}
                    </p>
                  </PremiumChartTooltip>
                );
              }}
            />
            <Scatter data={points} fill={color} />
          </ScatterChart>
      </ChartContainer>
    </div>
  );
}

export function AiCorrelationWidget({
  data,
  metricA = "spend",
  metricB = "conversions",
  showTrend = true
}: {
  data: DashboardData;
  metricA?: MetricKey;
  metricB?: MetricKey;
  showTrend?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");

  const { r, strengthKey, points } = useMemo(() => {
    const series = data.series as SeriesPoint[];
    const xs = series.map((p) => p[metricA] ?? 0);
    const ys = series.map((p) => p[metricB] ?? 0);
    const corr = pearsonCorrelation(xs, ys);
    const abs = Math.abs(corr);
    const strengthKey =
      abs >= 0.7 ? "correlationStrong" : abs >= 0.4 ? "correlationModerate" : "correlationWeak";
    return { r: corr, strengthKey, points: series.length };
  }, [data.series, metricA, metricB]);

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-xl" />;
  }

  const accent = METRIC_BY_KEY[metricB]?.color ?? "#22c55e";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-[var(--text-dim)]">
          {tMetrics(METRIC_BY_KEY[metricA]?.label ?? metricA)} ×{" "}
          {tMetrics(METRIC_BY_KEY[metricB]?.label ?? metricB)}
        </p>
        <span className="text-[10px] text-[var(--text-dimmer)]">
          {points} {t("correlationPoints")}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <span className="text-3xl font-bold tabular-nums" style={{ color: accent }}>
          {r >= 0 ? "+" : ""}
          {r.toFixed(2)}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${accent}22`, color: accent }}
        >
          {t(strengthKey)}
        </span>
      </div>
      {showTrend ? (
        <div className="min-h-0 flex-1">
          <ScatterWidget data={data} metricX={metricA} metricY={metricB} pointSize="small" />
        </div>
      ) : null}
    </div>
  );
}

export function ParetoWidget({
  data,
  metric = "spend",
  sortDescending = true,
  visual
}: {
  data: DashboardData;
  metric?: MetricKey;
  sortDescending?: boolean;
  visual?: SlotVisualConfig;
}) {
  const rows = useMemo(
    () => toParetoFromSeries(data.series as SeriesPoint[], metric, sortDescending),
    [data.series, metric, sortDescending]
  );

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-xl" />;
  }

  return (
    <div className="flex h-full min-h-[200px] min-w-0 flex-col">
      <PremiumChartRenderer
        chartStyle="pareto"
        paretoRows={rows}
        metricKey={metric}
        formatValue={data.formatMetricValue}
        visual={visual}
      />
    </div>
  );
}

export function BulletWidget({
  data,
  metric = "roas",
  targetValue,
  visual
}: {
  data: DashboardData;
  metric?: MetricKey;
  targetValue?: number;
  visual?: SlotVisualConfig;
}) {
  const current = data.summary?.[metric] ?? 0;
  const target = targetValue ?? visual?.targetValue ?? 0;

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[80px] rounded-xl" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-1">
      <PremiumChartRenderer
        chartStyle="bullet"
        bulletCurrent={current}
        bulletTarget={target}
        metricKey={metric}
        formatValue={data.formatMetricValue}
        visual={visual}
      />
    </div>
  );
}

export function BoxPlotWidget({
  data,
  metric = "spend",
  groupBy = "dayOfWeek",
  visual
}: {
  data: DashboardData;
  metric?: MetricKey;
  groupBy?: "campaign" | "client" | "dayOfWeek";
  visual?: SlotVisualConfig;
}) {
  const groups = useMemo(
    () => toBoxPlotGroups(data.series as SeriesPoint[], groupBy, metric),
    [data.series, groupBy, metric]
  );

  if (data.loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-xl" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PremiumChartRenderer
        chartStyle="boxplot"
        boxPlotGroups={groups}
        metricKey={metric}
        formatValue={data.formatMetricValue}
        visual={visual}
      />
    </div>
  );
}

export function RadarStandaloneWidget({
  data,
  chartMetrics,
  visual,
  compact = false
}: {
  data: DashboardData;
  chartMetrics?: MetricKey[];
  visual?: SlotVisualConfig;
  compact?: boolean;
}) {
  return (
    <PerformanceChartWidget
      data={data}
      chartMetrics={chartMetrics}
      chartStyle="radar"
      visual={visual}
      compact={compact}
    />
  );
}
