"use client";

import { useTranslations } from "next-intl";

import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { ChartStyle, ClientsHealthView, AlertsDensity } from "@/lib/dashboard/widget-config";

export function WidgetConfigPreview({
  widgetType,
  config
}: {
  widgetType: string;
  config: Record<string, unknown>;
}) {
  const t = useTranslations("dashboardWidgets");

  if (widgetType.startsWith("chart.")) {
    const style = (config.chartStyle as ChartStyle | undefined) ?? "area";
    const metricA = (config.metricA as MetricKey | undefined) ?? "spend";
    const metricB = (config.metricB as MetricKey | undefined) ?? "roas";
    const label =
      widgetType === "chart.compare"
        ? `${t(`metric_${metricA}`)} × ${t(`metric_${metricB}`)}`
        : t(
            widgetType === "chart.performance"
              ? "performanceChart"
              : widgetType === "chart.roasCpa"
                ? "chartRoasCpa"
                : widgetType === "chart.spendConversions"
                  ? "chartSpendConversions"
                  : "chartCompare"
          );

    return (
      <div
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
      >
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
          {t("configPreview")}
        </p>
        <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-main)" }}>
          {label}
        </p>
        <ChartStyleMock style={style} />
      </div>
    );
  }

  if (widgetType === "metrics.card" || widgetType.startsWith("metric.single.")) {
    const key =
      (config.metricKey as MetricKey | undefined) ??
      (widgetType.startsWith("metric.single.")
        ? (widgetType.replace("metric.single.", "") as MetricKey)
        : "spend");
    const meta = METRIC_BY_KEY[key];
    return (
      <div
        className="mt-3 rounded-xl border p-4 text-center"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
      >
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
          {t("configPreview")}
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
          {t(`metric_${key}`)}
        </p>
        <p className="mt-1 text-2xl font-bold" style={{ color: meta.color }}>
          —
        </p>
      </div>
    );
  }

  if (widgetType === "clients.health") {
    const view = (config.view as ClientsHealthView | undefined) ?? "full";
    return (
      <div
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
      >
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
          {t("configPreview")}
        </p>
        {view === "cards" || view === "full" ? (
          <div className="mb-2 grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded" style={{ background: "var(--surface-card)" }} />
            ))}
          </div>
        ) : null}
        {view === "table" || view === "full" ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 rounded" style={{ background: "var(--surface-card)" }} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (widgetType === "alerts.feed") {
    const density = (config.density as AlertsDensity | undefined) ?? "stacked";
    return (
      <div
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
      >
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
          {t("configPreview")}
        </p>
        <div className={density === "inline" ? "space-y-1" : "space-y-2"}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={density === "inline" ? "h-5 rounded" : "h-10 rounded-lg"}
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.12)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function ChartStyleMock({ style }: { style: ChartStyle }) {
  const points =
    style === "bar"
      ? [40, 65, 50, 80, 55, 70, 90]
      : [30, 45, 40, 60, 55, 75, 65, 85];

  if (style === "bar") {
    return (
      <div className="flex h-16 items-end gap-1">
        {points.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, background: "rgba(124,58,237,0.55)" }}
          />
        ))}
      </div>
    );
  }

  const path = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 100;
      const py = 100 - y;
      return `${i === 0 ? "M" : "L"}${x},${py}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-full" preserveAspectRatio="none">
      {style === "area" ? (
        <path d={`${path} L100,100 L0,100 Z`} fill="rgba(124,58,237,0.15)" />
      ) : null}
      <path d={path} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
