"use client";

import type { ReactNode } from "react";

import { parseExtendedChartStyle } from "@/lib/dashboard/slot-visual-config";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { ChartStyle } from "@/lib/dashboard/widget-config";

const VIOLET = "#a78bfa";
const AMBER = "#fbbf24";
const EMERALD = "#34d399";
const GRID = "rgba(148,163,184,0.14)";
const MUTED = "rgba(196,181,253,0.35)";

const DUAL_CHART_TYPES = new Set([
  "chart.roasCpa",
  "chart.spendConversions",
  "chart.impressionsClicks",
  "chart.ctrCpc",
  "chart.spendRoas",
  "chart.reachFrequency",
  "chart.cpmCpa",
  "chart.compare"
]);

function SvgDefs() {
  return (
    <defs>
      <linearGradient id="wl-violet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="wl-amber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="wl-violet-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="wl-amber-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5a623" stopOpacity="0.38" />
        <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="wl-emerald-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="wl-glow" cx="50%" cy="0%" r="70%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </radialGradient>
      <filter id="wl-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function ThumbFrame({
  children,
  accent = "violet"
}: {
  children: ReactNode;
  accent?: "violet" | "amber" | "emerald";
}) {
  const border =
    accent === "amber"
      ? "rgba(245,166,35,0.42)"
      : accent === "emerald"
        ? "rgba(52,211,153,0.35)"
        : "rgba(245,166,35,0.32)";

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] p-1"
      style={{
        background:
          "linear-gradient(155deg, rgba(124,58,237,0.18) 0%, rgba(10,15,20,0.95) 38%, rgba(15,20,28,0.98) 100%)",
        border: `1px solid ${border}`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 24px rgba(124,58,237,0.08), 0 8px 20px rgba(0,0,0,0.28)"
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "10px 10px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{ background: "rgba(124,58,237,0.22)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-4 h-16 w-16 rounded-full blur-2xl"
        style={{ background: "rgba(245,166,35,0.12)" }}
      />
      <svg viewBox="0 0 80 48" className="relative h-full w-full" aria-hidden>
        <SvgDefs />
        <rect x="0" y="0" width="80" height="48" fill="url(#wl-glow)" />
        {children}
      </svg>
    </div>
  );
}

function ChartGrid() {
  return (
    <>
      {[14, 24, 34].map((y) => (
        <line key={y} x1="4" y1={y} x2="76" y2={y} stroke={GRID} strokeWidth="0.6" />
      ))}
      <line x1="4" y1="42" x2="76" y2="42" stroke="rgba(148,163,184,0.22)" strokeWidth="0.8" />
    </>
  );
}

function linePath(values: number[], yBase = 42, xPad = 4, width = 72) {
  return values
    .map((y, i) => `${i === 0 ? "M" : "L"}${xPad + (i / (values.length - 1)) * width},${y}`)
    .join(" ");
}

function ChartLines({ dual = false }: { dual?: boolean }) {
  const violetPts = [34, 28, 30, 22, 24, 18, 20];
  const amberPts = [38, 34, 36, 30, 32, 26, 28];
  const vPath = linePath(violetPts);
  const aPath = linePath(amberPts);

  return (
    <>
      <ChartGrid />
      <path d={`${vPath} L76,42 L4,42 Z`} fill="url(#wl-violet-area)" />
      {dual ? <path d={`${aPath} L76,42 L4,42 Z`} fill="url(#wl-amber-area)" /> : null}
      <path
        d={vPath}
        fill="none"
        stroke="url(#wl-violet)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#wl-soft-glow)"
      />
      {dual ? (
        <path
          d={aPath}
          fill="none"
          stroke="url(#wl-amber)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={0.95}
        />
      ) : null}
    </>
  );
}

function ChartBars({ color = "violet" }: { color?: "violet" | "amber" }) {
  const heights = [12, 20, 16, 26, 18, 24, 14];
  const fill = color === "amber" ? "url(#wl-amber)" : "url(#wl-violet)";
  return (
    <>
      <ChartGrid />
      {heights.map((h, i) => (
        <rect
          key={i}
          x={5 + i * 10.2}
          y={42 - h}
          width={6.5}
          height={h}
          rx={2}
          fill={fill}
          opacity={0.55 + (i % 3) * 0.12}
        />
      ))}
    </>
  );
}

function PerformanceChartMock() {
  return (
    <ThumbFrame>
      <ChartLines dual />
    </ThumbFrame>
  );
}

function DualMetricChartMock({ style }: { style: ChartStyle | string }) {
  if (style === "bar") {
    return (
      <ThumbFrame accent="amber">
        <ChartBars color="violet" />
        <path
          d="M8,20 L22,22 L36,24 L50,26 L64,28"
          fill="none"
          stroke="url(#wl-amber)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </ThumbFrame>
    );
  }
  if (style === "line") {
    return (
      <ThumbFrame>
        <ChartLines dual />
      </ThumbFrame>
    );
  }
  return (
    <ThumbFrame>
      <ChartLines dual />
    </ThumbFrame>
  );
}

function ChartAreaMock({ style }: { style: ChartStyle | string }) {
  if (style === "bar") {
    return (
      <ThumbFrame>
        <ChartBars />
      </ThumbFrame>
    );
  }
  if (style === "line" || style === "area") {
    return (
      <ThumbFrame>
        <ChartLines />
      </ThumbFrame>
    );
  }
  if (style === "pie" || style === "donut") {
    return (
      <ThumbFrame accent="amber">
        <circle cx="40" cy="24" r="15" fill="none" stroke="rgba(245,166,35,0.25)" strokeWidth="7" />
        <path d="M40 9 A15 15 0 0 1 54 30 L40 24 Z" fill="url(#wl-amber)" opacity={0.95} />
        <path d="M40 9 A15 15 0 1 1 26 30 L40 24 Z" fill="url(#wl-violet)" opacity={0.85} />
        {style === "donut" ? <circle cx="40" cy="24" r="6.5" fill="rgba(10,15,20,0.85)" /> : null}
      </ThumbFrame>
    );
  }
  if (style === "radar") {
    const cx = 40;
    const cy = 24;
    const r = 15;
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
        <polygon points={pts} fill="url(#wl-amber-area)" stroke="url(#wl-amber)" strokeWidth="1.5" />
      </ThumbFrame>
    );
  }
  if (style === "composed") {
    return (
      <ThumbFrame>
        <ChartBars />
        <path
          d="M8,28 L22,24 L36,26 L50,18 L64,22"
          fill="none"
          stroke={EMERALD}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </ThumbFrame>
    );
  }
  if (style === "pareto") {
    return (
      <ThumbFrame accent="amber">
        <ChartBars color="amber" />
        <path
          d="M8,18 L22,22 L36,26 L50,30 L64,34"
          fill="none"
          stroke="url(#wl-violet)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </ThumbFrame>
    );
  }
  if (style === "bullet") {
    return (
      <ThumbFrame accent="emerald">
        <rect x="8" y="20" width="52" height="8" rx="4" fill="rgba(148,163,184,0.12)" />
        <rect x="8" y="20" width="36" height="8" rx="4" fill="url(#wl-emerald-area)" stroke={EMERALD} strokeWidth="0.8" />
        <line x1="52" y1="16" x2="52" y2="32" stroke="url(#wl-amber)" strokeWidth="2" />
      </ThumbFrame>
    );
  }
  if (style === "boxplot") {
    return (
      <ThumbFrame accent="amber">
        {[18, 40, 62].map((cx) => (
          <g key={cx}>
            <line x1={cx} y1="12" x2={cx} y2="36" stroke="rgba(245,166,35,0.35)" strokeWidth="1.2" />
            <rect
              x={cx - 6}
              y="18"
              width={12}
              height="14"
              rx="1.5"
              fill="url(#wl-amber-area)"
              stroke="url(#wl-amber)"
              strokeWidth="0.9"
            />
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
      <rect
        x="10"
        y="8"
        width="60"
        height="32"
        rx="6"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(245,166,35,0.22)"
      />
      <rect x="16" y="14" width="22" height="3" rx="1.5" fill={MUTED} />
      <rect x="16" y="22" width="30" height="7" rx="2" fill={color} opacity={0.95} />
      <rect x="16" y="32" width="18" height="2.5" rx="1" fill="rgba(52,211,153,0.55)" />
    </ThumbFrame>
  );
}

function HeroKpisMock() {
  return (
    <ThumbFrame>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${8 + i * 24}, 7)`}>
          <rect
            width="20"
            height="34"
            rx="5"
            fill="rgba(255,255,255,0.04)"
            stroke={i === 1 ? "rgba(245,166,35,0.38)" : "rgba(124,58,237,0.28)"}
          />
          <rect x="3" y="6" width="14" height="2.5" rx="1" fill={MUTED} />
          <rect
            x="3"
            y="14"
            width={i === 1 ? 12 : 10}
            height="6"
            rx="1.5"
            fill={i === 1 ? "url(#wl-amber)" : "url(#wl-violet)"}
          />
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
          fill={i % 2 === 0 ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.05)"}
          stroke={i % 2 === 0 ? "rgba(245,166,35,0.35)" : "rgba(148,163,184,0.18)"}
        />
      ))}
    </ThumbFrame>
  );
}

function TaskbarMock() {
  return (
    <ThumbFrame>
      <rect x="4" y="14" width="14" height="20" rx="3" fill="rgba(124,58,237,0.22)" stroke="rgba(245,166,35,0.28)" />
      <rect x="22" y="10" width="36" height="28" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(148,163,184,0.16)" />
      <ChartGrid />
      <path
        d="M26,30 L34,26 L42,28 L50,22 L58,24"
        fill="none"
        stroke="url(#wl-violet)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="62" y="14" width="14" height="20" rx="3" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.28)" />
    </ThumbFrame>
  );
}

function ScatterMock() {
  const dots = [
    [12, 34], [18, 28], [24, 32], [30, 22], [38, 26], [44, 18], [52, 24], [58, 14], [66, 20]
  ];
  return (
    <ThumbFrame accent="amber">
      <ChartGrid />
      <line x1="6" y1="42" x2="6" y2="8" stroke="rgba(148,163,184,0.18)" strokeWidth="0.8" />
      {dots.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2.8"
          fill={i % 2 === 0 ? "url(#wl-amber)" : "url(#wl-violet)"}
          opacity={0.85}
        />
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
          rx="2.5"
          fill={`rgba(124,58,237,${0.12 + v * 0.55})`}
          stroke={`rgba(245,166,35,${0.08 + v * 0.22})`}
          strokeWidth="0.6"
        />
      ))}
    </ThumbFrame>
  );
}

function CorrelationMock() {
  return (
    <ThumbFrame accent="emerald">
      <text x="8" y="22" fill={EMERALD} fontSize="13" fontWeight="700">
        +0.82
      </text>
      <circle cx="58" cy="30" r="2.5" fill="url(#wl-violet)" />
      <circle cx="52" cy="24" r="2.5" fill="url(#wl-violet)" opacity={0.85} />
      <circle cx="64" cy="26" r="2.5" fill="url(#wl-amber)" />
      <circle cx="56" cy="34" r="2.5" fill="url(#wl-violet)" opacity={0.75} />
      <path
        d="M48,32 L62,24"
        stroke="rgba(52,211,153,0.45)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
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
          fill={i === 0 ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)"}
          stroke={i === 0 ? "rgba(239,68,68,0.35)" : "rgba(148,163,184,0.14)"}
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
          fill={i === 2 ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.05)"}
          stroke={i === 2 ? "rgba(52,211,153,0.4)" : "rgba(148,163,184,0.12)"}
        />
      ))}
    </ThumbFrame>
  );
}

function BrainBannerMock() {
  return (
    <ThumbFrame accent="violet">
      <circle cx="14" cy="24" r="6" fill="rgba(124,58,237,0.28)" stroke="rgba(245,166,35,0.32)" />
      <rect x="26" y="18" width="36" height="3.5" rx="1.5" fill={MUTED} />
      <rect x="26" y="26" width="24" height="3.5" rx="1.5" fill="rgba(167,139,250,0.55)" />
      <rect
        x="58"
        y="20"
        width="14"
        height="8"
        rx="4"
        fill="rgba(245,166,35,0.18)"
        stroke="rgba(245,166,35,0.35)"
      />
    </ThumbFrame>
  );
}

function GenericMock({ accent = "violet" }: { accent?: "violet" | "amber" | "emerald" }) {
  return (
    <ThumbFrame accent={accent}>
      <rect
        x="12"
        y="10"
        width="56"
        height="28"
        rx="5"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(245,166,35,0.22)"
      />
      <rect x="18" y="18" width="28" height="3" rx="1.5" fill={MUTED} />
      <rect x="18" y="26" width="20" height="3" rx="1.5" fill="rgba(167,139,250,0.5)" />
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
  if (widgetType === "chart.performance" || widgetType === "premium.multiChart") {
    return <PerformanceChartMock />;
  }
  if (DUAL_CHART_TYPES.has(widgetType)) {
    return <DualMetricChartMock style={chartStyle} />;
  }
  if (widgetType.startsWith("chart.") || widgetType === "advanced.radar") {
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
