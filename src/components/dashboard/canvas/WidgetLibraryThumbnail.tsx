"use client";

import type { ReactNode } from "react";

import { parseExtendedChartStyle } from "@/lib/dashboard/slot-visual-config";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { ChartStyle } from "@/lib/dashboard/widget-config";

const VIOLET = "#818cf8";
const VIOLET_SOFT = "rgba(129,140,248,0.45)";
const VIOLET_FILL = "rgba(129,140,248,0.18)";
const AMBER = "#f59e0b";
const AMBER_SOFT = "rgba(245,158,11,0.5)";
const GREEN = "#34d399";
const GRID = "rgba(148,163,184,0.12)";

function ThumbFrame({
  children,
  accent = "violet"
}: {
  children: ReactNode;
  accent?: "violet" | "amber" | "emerald";
}) {
  const bg =
    accent === "amber"
      ? "linear-gradient(145deg, rgba(245,158,11,0.14) 0%, rgba(234,88,12,0.06) 55%, rgba(15,23,42,0.02) 100%)"
      : accent === "emerald"
        ? "linear-gradient(145deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.05) 100%)"
        : "linear-gradient(145deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.07) 55%, rgba(15,23,42,0.02) 100%)";
  const border =
    accent === "amber"
      ? "rgba(245,158,11,0.22)"
      : accent === "emerald"
        ? "rgba(52,211,153,0.22)"
        : "rgba(99,102,241,0.2)";

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg p-1.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <svg viewBox="0 0 80 48" className="h-full w-full" aria-hidden>
        <rect x="0" y="0" width="80" height="48" fill="transparent" />
        {children}
      </svg>
    </div>
  );
}

function ChartLines({ color = VIOLET }: { color?: string }) {
  const pts = [38, 32, 36, 24, 28, 18, 22];
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 76 + 2},${y}`).join(" ");
  return (
    <>
      <path d={`${d} L78,46 L2,46 Z`} fill={`${color}22`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function ChartBars({ color = VIOLET_SOFT }: { color?: string }) {
  const heights = [14, 22, 18, 28, 20, 26, 16];
  return (
    <>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={4 + i * 10.5}
          y={46 - h}
          width={7}
          height={h}
          rx={1.5}
          fill={color}
        />
      ))}
    </>
  );
}

function ChartAreaMock({ style }: { style: ChartStyle | string }) {
  if (style === "bar") {
    return (
      <ThumbFrame>
        <line x1="2" y1="46" x2="78" y2="46" stroke={GRID} />
        <ChartBars />
      </ThumbFrame>
    );
  }
  if (style === "line") {
    return (
      <ThumbFrame>
        <ChartLines />
      </ThumbFrame>
    );
  }
  if (style === "pie" || style === "donut") {
    return (
      <ThumbFrame accent="amber">
        <circle cx="40" cy="24" r="16" fill="none" stroke={AMBER_SOFT} strokeWidth="8" />
        <path d="M40 8 A16 16 0 0 1 52 32 L40 24 Z" fill={AMBER} opacity={0.85} />
        <path d="M40 8 A16 16 0 1 1 28 32 L40 24 Z" fill={VIOLET} opacity={0.7} />
        {style === "donut" ? <circle cx="40" cy="24" r="7" fill="rgba(15,23,42,0.15)" /> : null}
      </ThumbFrame>
    );
  }
  if (style === "radar") {
    const cx = 40;
    const cy = 24;
    const r = 16;
    const angles = [0, 72, 144, 216, 288];
    const vals = [0.9, 0.65, 0.8, 0.5, 0.75];
    const pts = angles
      .map((deg, i) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        return `${cx + Math.cos(rad) * r * vals[i]},${cy + Math.sin(rad) * r * vals[i]}`;
      })
      .join(" ");
    return (
      <ThumbFrame accent="amber">
        {[0.33, 0.66, 1].map((s) => (
          <polygon
            key={s}
            points={angles
              .map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return `${cx + Math.cos(rad) * r * s},${cy + Math.sin(rad) * r * s}`;
              })
              .join(" ")}
            fill="none"
            stroke={GRID}
          />
        ))}
        <polygon points={pts} fill={`${AMBER}44`} stroke={AMBER} strokeWidth="1.5" />
      </ThumbFrame>
    );
  }
  if (style === "composed") {
    return (
      <ThumbFrame>
        <ChartBars color={VIOLET_SOFT} />
        <ChartLines color={GREEN} />
      </ThumbFrame>
    );
  }
  if (style === "pareto") {
    return (
      <ThumbFrame accent="amber">
        <ChartBars color={AMBER_SOFT} />
        <path
          d="M8,18 L22,22 L36,26 L50,30 L64,34"
          fill="none"
          stroke={VIOLET}
          strokeWidth="1.5"
        />
      </ThumbFrame>
    );
  }
  if (style === "bullet") {
    return (
      <ThumbFrame accent="emerald">
        <rect x="8" y="20" width="52" height="8" rx="4" fill="rgba(148,163,184,0.15)" />
        <rect x="8" y="20" width="36" height="8" rx="4" fill={GREEN} opacity={0.85} />
        <line x1="52" y1="16" x2="52" y2="32" stroke={AMBER} strokeWidth="2" />
      </ThumbFrame>
    );
  }
  if (style === "boxplot") {
    return (
      <ThumbFrame accent="amber">
        {[18, 40, 62].map((cx) => (
          <g key={cx}>
            <line x1={cx} y1="12" x2={cx} y2="36" stroke={AMBER_SOFT} strokeWidth="1.2" />
            <rect x={cx - 6} y="18" width={12} height="14" rx="1" fill={`${AMBER}33`} stroke={AMBER} strokeWidth="1" />
            <line x1={cx - 6} y1="25" x2={cx + 6} y2="25" stroke={AMBER} strokeWidth="1.4" />
          </g>
        ))}
      </ThumbFrame>
    );
  }
  return (
    <ThumbFrame>
      <ChartLines />
    </ThumbFrame>
  );
}

function MetricCardMock({ metricKey }: { metricKey?: MetricKey }) {
  const color = METRIC_BY_KEY[metricKey ?? "spend"]?.color ?? VIOLET;
  return (
    <ThumbFrame>
      <rect x="10" y="10" width="60" height="28" rx="4" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="16" width="24" height="4" rx="2" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="24" width="32" height="6" rx="2" fill={color} opacity={0.9} />
    </ThumbFrame>
  );
}

function HeroKpisMock() {
  return (
    <ThumbFrame>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${8 + i * 24}, 8)`}>
          <rect width="20" height="32" rx="3" fill="rgba(148,163,184,0.08)" stroke={GRID} />
          <rect x="3" y="6" width="14" height="3" rx="1" fill="rgba(148,163,184,0.2)" />
          <rect x="3" y="14" width="10" height="5" rx="1" fill={i === 1 ? GREEN : VIOLET} opacity={0.85} />
        </g>
      ))}
    </ThumbFrame>
  );
}

function QuickPillsMock() {
  return (
    <ThumbFrame>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={6 + i * 18}
          y="18"
          width="14"
          height="12"
          rx="6"
          fill={i % 2 === 0 ? VIOLET_FILL : "rgba(148,163,184,0.12)"}
          stroke={i % 2 === 0 ? VIOLET_SOFT : GRID}
        />
      ))}
    </ThumbFrame>
  );
}

function TaskbarMock() {
  return (
    <ThumbFrame>
      <rect x="4" y="14" width="16" height="20" rx="3" fill={VIOLET_FILL} stroke={VIOLET_SOFT} />
      <rect x="24" y="10" width="32" height="28" rx="3" fill="rgba(148,163,184,0.08)" stroke={GRID} />
      <ChartLines color={VIOLET} />
      <rect x="60" y="14" width="16" height="20" rx="3" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.25)" />
    </ThumbFrame>
  );
}

function ScatterMock() {
  const dots = [
    [12, 34], [18, 28], [24, 32], [30, 22], [38, 26], [44, 18], [52, 24], [58, 14], [66, 20]
  ];
  return (
    <ThumbFrame accent="amber">
      <line x1="6" y1="42" x2="74" y2="42" stroke={GRID} />
      <line x1="6" y1="42" x2="6" y2="8" stroke={GRID} />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={AMBER} opacity={0.75 + (i % 3) * 0.08} />
      ))}
    </ThumbFrame>
  );
}

function HeatmapMock() {
  const vals = [0.3, 0.6, 0.9, 0.5, 0.7, 0.4, 0.85, 0.55, 0.65, 0.45];
  return (
    <ThumbFrame>
      {vals.map((v, i) => (
        <rect
          key={i}
          x={4 + (i % 5) * 14}
          y={8 + Math.floor(i / 5) * 14}
          width="11"
          height="11"
          rx="2"
          fill={`rgba(129,140,248,${0.15 + v * 0.65})`}
        />
      ))}
    </ThumbFrame>
  );
}

function CorrelationMock() {
  return (
    <ThumbFrame accent="emerald">
      <text x="8" y="20" fill={GREEN} fontSize="14" fontWeight="700">
        +0.82
      </text>
      <circle cx="58" cy="30" r="2" fill={VIOLET} />
      <circle cx="52" cy="24" r="2" fill={VIOLET} opacity={0.8} />
      <circle cx="64" cy="26" r="2" fill={VIOLET} opacity={0.7} />
      <circle cx="56" cy="34" r="2" fill={VIOLET} opacity={0.85} />
    </ThumbFrame>
  );
}

function AlertsMock() {
  return (
    <ThumbFrame>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x="8"
          y={10 + i * 12}
          width="64"
          height="8"
          rx="2"
          fill={i === 0 ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.1)"}
          stroke={i === 0 ? "rgba(239,68,68,0.35)" : GRID}
        />
      ))}
    </ThumbFrame>
  );
}

function HealthMock() {
  return (
    <ThumbFrame accent="emerald">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={8 + i * 16}
          y="12"
          width="12"
          height="24"
          rx="2"
          fill={i === 2 ? `${GREEN}55` : "rgba(148,163,184,0.12)"}
        />
      ))}
    </ThumbFrame>
  );
}

function BrainBannerMock() {
  return (
    <ThumbFrame accent="violet">
      <circle cx="14" cy="24" r="6" fill={VIOLET_FILL} stroke={VIOLET_SOFT} />
      <rect x="26" y="18" width="36" height="4" rx="2" fill="rgba(148,163,184,0.25)" />
      <rect x="26" y="26" width="24" height="4" rx="2" fill={VIOLET_SOFT} />
      <rect x="58" y="20" width="14" height="8" rx="4" fill={VIOLET_FILL} stroke={VIOLET_SOFT} />
    </ThumbFrame>
  );
}

function GenericMock({ accent = "violet" }: { accent?: "violet" | "amber" | "emerald" }) {
  return (
    <ThumbFrame accent={accent}>
      <rect x="12" y="10" width="56" height="28" rx="4" fill="rgba(148,163,184,0.08)" stroke={GRID} />
      <rect x="18" y="18" width="28" height="4" rx="2" fill="rgba(148,163,184,0.2)" />
      <rect x="18" y="26" width="20" height="4" rx="2" fill={VIOLET_SOFT} />
    </ThumbFrame>
  );
}

export function WidgetLibraryThumbnail({
  widgetType,
  config: configProp,
  isPremium = false
}: {
  widgetType: string;
  config?: Record<string, unknown>;
  isPremium?: boolean;
}) {
  const config = configProp ?? defaultWidgetConfig(widgetType);
  const chartStyle = parseExtendedChartStyle(config.chartStyle);

  if (widgetType === "metrics.heroKpis") return <HeroKpisMock />;
  if (widgetType === "metrics.quickPills") return <QuickPillsMock />;
  if (widgetType === "metrics.card" || widgetType.startsWith("metric.single.")) {
    const key =
      (config.metricKey as MetricKey | undefined) ??
      (widgetType.startsWith("metric.single.")
        ? (widgetType.replace("metric.single.", "") as MetricKey)
        : "spend");
    return <MetricCardMock metricKey={key} />;
  }
  if (widgetType === "layout.taskbar" || widgetType === "premium.metricMatrix") return <TaskbarMock />;
  if (widgetType.startsWith("chart.") || widgetType === "premium.multiChart" || widgetType === "advanced.radar") {
    const style = widgetType === "advanced.radar" ? "radar" : chartStyle;
    return <ChartAreaMock style={style} />;
  }
  if (widgetType === "advanced.scatter") return <ScatterMock />;
  if (widgetType === "advanced.heatmap") return <HeatmapMock />;
  if (widgetType === "advanced.pareto") return <ChartAreaMock style="pareto" />;
  if (widgetType === "premium.bullet") return <ChartAreaMock style="bullet" />;
  if (widgetType === "advanced.boxplot") return <ChartAreaMock style="boxplot" />;
  if (widgetType === "ai.correlation") return <CorrelationMock />;
  if (widgetType === "alerts.feed") return <AlertsMock />;
  if (widgetType === "clients.health") return <HealthMock />;
  if (widgetType === "brain.learnings") return <BrainBannerMock />;
  if (widgetType.startsWith("ai.")) return <BrainBannerMock />;

  return <GenericMock accent={isPremium ? "amber" : "violet"} />;
}
