"use client";

import { cn } from "@/lib/cn";
import {
  templateGridBounds,
  widgetThumbColor,
  type DashboardTemplateWidget
} from "@/lib/dashboard/dashboard-template-thumb";

const GAP = 1.5;

export function DashboardTemplateThumb({
  widgets,
  activeIndex = -1,
  className,
  width = 88,
  height: heightProp
}: {
  widgets: DashboardTemplateWidget[];
  activeIndex?: number;
  className?: string;
  width?: number | string;
  /** Quando definido, o thumb preenche o container fixo sem esticar blocos. */
  height?: number | string;
}) {
  const { rows } = templateGridBounds(widgets);
  const unit = 7;
  const autoHeight = Math.max(rows * unit + GAP * 2, 40);
  const height = heightProp ?? autoHeight;

  if (!widgets.length) {
    return (
      <div
        className={cn("shrink-0 rounded-lg border border-dashed", className)}
        style={{
          width,
          height,
          borderColor: "var(--border-color)",
          background: "var(--surface-bg)"
        }}
      />
    );
  }

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-lg border", className)}
      style={{
        width,
        height,
        borderColor: "var(--border-color)",
        background: "var(--surface-bg)",
        padding: GAP
      }}
    >
      {widgets.map((w, i) => {
        const lit = activeIndex === i;
        return (
          <div
            key={`${w.widgetType}-${w.x}-${w.y}-${i}`}
            className={cn(
              "absolute rounded-[3px] transition-all duration-300",
              lit && "ring-1 ring-indigo-400 ring-offset-1"
            )}
            style={{
              left: `calc(${GAP}px + (100% - ${GAP * 2}px) * ${w.x / 12})`,
              top: `calc(${GAP}px + (100% - ${GAP * 2}px) * ${w.y / rows})`,
              width: `calc((100% - ${GAP * 2}px) * ${w.w / 12} - ${GAP / 2}px)`,
              height: `calc((100% - ${GAP * 2}px) * ${w.h / rows} - ${GAP / 2}px)`,
              background: widgetThumbColor(w.widgetType),
              opacity: activeIndex < 0 || lit ? 1 : 0.5,
              transform: lit ? "scale(1.03)" : "scale(1)",
              zIndex: lit ? 2 : 1
            }}
          />
        );
      })}
    </div>
  );
}
