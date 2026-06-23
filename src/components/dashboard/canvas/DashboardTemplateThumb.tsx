"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import {
  PremiumPreviewFrame,
  PremiumSvgDefs
} from "@/components/dashboard/canvas/PremiumPreviewFrame";
import {
  templateGridBounds,
  type DashboardTemplateWidget
} from "@/lib/dashboard/dashboard-template-thumb";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

const VIEW_W = 80;
const PAD = 3;
const GAP = 1.1;
const ROW_UNIT = 5.2;

function widgetBlockStyle(widgetType: string): { fill: string; stroke: string } {
  const def = getWidgetDefinition(widgetType);
  const category = def?.category;
  if (category === "metrics" || widgetType.startsWith("metric.")) {
    return { fill: "rgba(16,185,129,0.32)", stroke: "rgba(52,211,153,0.42)" };
  }
  if (category === "charts" || widgetType.startsWith("chart.")) {
    return { fill: "rgba(124,58,237,0.32)", stroke: "rgba(245,166,35,0.32)" };
  }
  if (category === "ai" || widgetType.startsWith("ai.")) {
    return { fill: "rgba(168,85,247,0.28)", stroke: "rgba(196,181,253,0.35)" };
  }
  if (category === "alerts") {
    return { fill: "rgba(245,166,35,0.22)", stroke: "rgba(251,191,36,0.38)" };
  }
  if (category === "clients") {
    return { fill: "rgba(14,165,233,0.22)", stroke: "rgba(56,189,248,0.35)" };
  }
  if (category === "premium" || category === "layouts") {
    return { fill: "rgba(236,72,153,0.22)", stroke: "rgba(245,166,35,0.3)" };
  }
  if (category === "advanced") {
    return { fill: "rgba(234,88,12,0.22)", stroke: "rgba(251,191,36,0.32)" };
  }
  return { fill: "rgba(124,58,237,0.18)", stroke: "rgba(148,163,184,0.22)" };
}

function widgetMiniDetail(widgetType: string, x: number, y: number, w: number, h: number) {
  const def = getWidgetDefinition(widgetType);
  const isChart =
    def?.category === "charts" || widgetType.startsWith("chart.") || widgetType === "premium.multiChart";
  const isMetric = def?.category === "metrics" || widgetType.startsWith("metric.");

  if (isChart && w > 10 && h > 6) {
    const lineY = [0.75, 0.55, 0.65, 0.4, 0.5, 0.28, 0.35];
    const d = lineY
      .map((t, i) => {
        const px = x + 2 + (i / (lineY.length - 1)) * (w - 4);
        const py = y + h - 2 - t * (h - 4);
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      })
      .join(" ");
    return (
      <path
        d={d}
        fill="none"
        stroke="url(#tpl-violet)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity={0.92}
      />
    );
  }

  if (isMetric && w > 6) {
    return (
      <>
        <rect x={x + 2} y={y + 2} width={Math.min(w - 4, 12)} height={1.2} rx={0.6} fill="rgba(196,181,253,0.45)" />
        <rect x={x + 2} y={y + h - 3.5} width={Math.min(w - 4, 10)} height={2} rx={0.8} fill="url(#tpl-emerald)" />
      </>
    );
  }

  if (def?.category === "alerts" && h > 5) {
    return [0, 1, 2].map((i) => (
      <rect
        key={i}
        x={x + 2}
        y={y + 2 + i * 2.2}
        width={w - 4}
        height={1.2}
        rx={0.6}
        fill={i === 0 ? "rgba(251,191,36,0.55)" : "rgba(148,163,184,0.2)"}
      />
    ));
  }

  return null;
}

function computeViewHeight(rows: number) {
  return PAD * 2 + rows * ROW_UNIT + Math.max(0, rows - 1) * GAP;
}

export function dashboardTemplateThumbHeight(widgets: DashboardTemplateWidget[], maxHeight?: number) {
  const { rows } = templateGridBounds(widgets);
  const h = computeViewHeight(rows) + 8;
  return maxHeight ? Math.min(maxHeight, Math.max(72, h * 2.2)) : Math.max(56, h * 2.2);
}

export function DashboardTemplateThumb({
  widgets,
  activeIndex = -1,
  className,
  width = "100%",
  height = "100%",
  accent = "violet"
}: {
  widgets: DashboardTemplateWidget[];
  activeIndex?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
  accent?: "violet" | "amber" | "emerald";
}) {
  const { rows } = templateGridBounds(widgets);
  const viewH = computeViewHeight(rows);
  const innerW = VIEW_W - PAD * 2;
  const innerH = viewH - PAD * 2;

  if (!widgets.length) {
    return (
      <PremiumPreviewFrame
        className={cn("flex items-center justify-center", className)}
        accent={accent}
        borderRadius="10px"
        style={{ width, height } as CSSProperties}
      >
        <span className="text-[9px] font-medium text-violet-200/40">—</span>
      </PremiumPreviewFrame>
    );
  }

  return (
    <PremiumPreviewFrame className={className} accent={accent} borderRadius="10px" style={{ width, height } as CSSProperties}>
      <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="relative h-full w-full" aria-hidden>
        <PremiumSvgDefs />
        <rect x="0" y="0" width={VIEW_W} height={viewH} fill="url(#tpl-glow)" />
        {widgets.map((w, i) => {
          const lit = activeIndex === i;
          const style = widgetBlockStyle(w.widgetType);
          const x = PAD + (w.x / 12) * innerW;
          const y = PAD + (w.y / rows) * innerH;
          const bw = (w.w / 12) * innerW - GAP;
          const bh = (w.h / rows) * innerH - GAP;

          return (
            <g key={`${w.widgetType}-${w.x}-${w.y}-${i}`}>
              <rect
                x={x}
                y={y}
                width={Math.max(bw, 2)}
                height={Math.max(bh, 2)}
                rx={1.8}
                fill={style.fill}
                stroke={lit ? "rgba(251,191,36,0.75)" : style.stroke}
                strokeWidth={lit ? 1.1 : 0.7}
                opacity={activeIndex < 0 || lit ? 1 : 0.72}
              />
              {widgetMiniDetail(w.widgetType, x, y, bw, bh)}
            </g>
          );
        })}
      </svg>
    </PremiumPreviewFrame>
  );
}
