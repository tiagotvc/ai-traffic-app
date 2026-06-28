"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis
} from "recharts";

import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
import { formatSparkAxisValue } from "@/lib/dashboard/metric-kpi-theme";
import { premiumActiveDot, premiumAreaGradientStops, premiumGridProps, premiumRechartsTooltipProps } from "@/lib/dashboard/premium-chart-theme";

interface Props {
  data: number[];
  labels?: string[];
  color: string;
  formatValue?: (value: number) => string;
  variant?: "default" | "premium" | "creator";
  dark?: boolean;
}

function sparkYDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) {
    const pad = max === 0 ? 1 : Math.abs(max) * 0.15 || 1;
    return [min - pad, max + pad];
  }
  const span = max - min;
  return [min - span * 0.08, max + span * 0.08];
}

function LastPointDot({
  cx,
  cy,
  index,
  lastIndex,
  color,
  glowId,
  dark
}: {
  cx?: number;
  cy?: number;
  index?: number;
  lastIndex: number;
  color: string;
  glowId: string;
  dark: boolean;
}) {
  if (index !== lastIndex || cx == null || cy == null) return null;
  const dot = (
    <circle
      cx={cx}
      cy={cy}
      r={dark ? 5 : 4}
      fill={color}
      stroke={dark ? "rgba(255,255,255,0.85)" : "#ffffff"}
      strokeWidth={dark ? 1.5 : 2}
    />
  );
  return dark ? <g filter={`url(#${glowId})`}>{dot}</g> : dot;
}

export function SparklineChart({
  data,
  labels,
  color,
  formatValue,
  variant = "default",
  dark = false
}: Props) {
  const fillId = useId().replace(/:/g, "");
  const glowId = useId().replace(/:/g, "");
  const chartData = data.map((v, i) => ({
    i,
    v,
    label: labels?.[i] ?? ""
  }));
  const plotData =
    chartData.length === 1
      ? [
          { ...chartData[0], i: 0 },
          { ...chartData[0], i: 1 }
        ]
      : chartData;

  if (plotData.length < 2) {
    return (
      <div
        className="flex h-full min-h-[48px] items-center justify-center rounded text-[10px]"
        style={{ color: "var(--text-dimmer)" }}
      >
        —
      </div>
    );
  }

  if (variant === "creator" || variant === "premium") {
    const isCreator = variant === "creator";
    const grid = isCreator
      ? "color-mix(in srgb, var(--chart-grid) 65%, transparent)"
      : dark
        ? "rgba(148,163,184,0.14)"
        : "rgba(148,163,184,0.35)";
    const tick = "var(--chart-tick)";
    const lastIndex = plotData.length - 1;
    const yDomain = sparkYDomain(plotData.map((p) => p.v));
    const axisTick = { fill: tick, fontSize: 8, fontWeight: 600 as const };
    const lineColor = isCreator ? color : color;
    const gradientStops = isCreator
      ? premiumAreaGradientStops(lineColor)
      : [
          { offset: "0%", stopColor: color, stopOpacity: dark ? 0.42 : 0.22 },
          { offset: "55%", stopColor: color, stopOpacity: dark ? 0.14 : 0.08 },
          { offset: "100%", stopColor: color, stopOpacity: 0.01 }
        ];

    return (
      <div className="dashboard-kpi-card__spark-inner h-full min-h-[48px] w-full">
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart
            data={plotData}
            margin={{ top: 4, right: isCreator ? 4 : 2, left: isCreator ? 0 : 2, bottom: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                {gradientStops.map((stop) => (
                  <stop
                    key={stop.offset}
                    offset={stop.offset}
                    stopColor={stop.stopColor}
                    stopOpacity={stop.stopOpacity}
                  />
                ))}
              </linearGradient>
              {!isCreator && dark ? (
                <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ) : null}
            </defs>
            <CartesianGrid
              {...(isCreator ? premiumGridProps() : { stroke: grid, strokeDasharray: "3 3", vertical: false })}
            />
            {!isCreator ? (
              <>
                <YAxis
                  yAxisId="left"
                  width={30}
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={(v: number) => formatSparkAxisValue(Number(v))}
                  domain={yDomain}
                  tickCount={2}
                />
                <YAxis
                  yAxisId="right"
                  width={30}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={(v: number) => formatSparkAxisValue(Number(v))}
                  domain={yDomain}
                  tickCount={2}
                />
              </>
            ) : null}
            <Tooltip
              {...premiumRechartsTooltipProps}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as { v: number; label: string };
                const display = formatValue?.(Number(point.v)) ?? String(point.v);
                return (
                  <PremiumChartTooltip title={point.label || undefined}>
                    <p className="font-semibold">{display}</p>
                  </PremiumChartTooltip>
                );
              }}
            />
            <Area
              yAxisId={isCreator ? undefined : "left"}
              type="monotone"
              dataKey="v"
              stroke={lineColor}
              fill={`url(#${fillId})`}
              strokeWidth={isCreator ? 1.75 : dark ? 2.25 : 2}
              dot={false}
              activeDot={premiumActiveDot(lineColor)}
              animationDuration={isCreator ? 700 : 900}
              animationEasing="ease-out"
              style={{ filter: !isCreator && dark ? `drop-shadow(0 0 6px ${color}88)` : undefined }}
            />
            {!isCreator ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="v"
                stroke="transparent"
                dot={(props) => (
                  <LastPointDot
                    {...props}
                    lastIndex={lastIndex}
                    color={color}
                    glowId={glowId}
                    dark={dark}
                  />
                )}
                activeDot={false}
                legendType="none"
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[48px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={premiumActiveDot(color)}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Tooltip
            {...premiumRechartsTooltipProps}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { v: number; label: string };
              const display = formatValue?.(Number(point.v)) ?? String(point.v);
              return (
                <PremiumChartTooltip title={point.label || undefined}>
                  <p className="font-semibold">{display}</p>
                </PremiumChartTooltip>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
