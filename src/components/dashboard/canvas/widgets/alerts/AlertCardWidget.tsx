"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import type { AlertCardPayload, AlertWidgetConfig } from "@/lib/dashboard/alert-widget-config";
import {
  parseAlertWidgetConfig,
  resolveAlertDisplaySize,
  resolveAlertLayout,
  resolveAlertThemeForApp
} from "@/lib/dashboard/alert-widget-config";
import {
  AlertBrainInsightTemplate,
  AlertBrainProgressTemplate,
  AlertCompactTemplate,
  AlertMetricThresholdTemplate
} from "./AlertTemplates";

export function AlertCardWidget({
  config,
  widgetWidth,
  widgetHeight
}: {
  config: Record<string, unknown>;
  widgetWidth?: number;
  widgetHeight?: number;
}) {
  const parsed = parseAlertWidgetConfig(config);
  const appDark = useAppDarkMode();
  const visual = useMemo(
    () => resolveAlertThemeForApp(parsed.visual, appDark),
    [parsed.visual, appDark]
  );
  const [data, setData] = useState<AlertCardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const configKey = JSON.stringify(config);
  const displaySize = resolveAlertDisplaySize(widgetWidth, widgetHeight);
  const layout = resolveAlertLayout(parsed.visual, widgetWidth, widgetHeight);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = encodeURIComponent(configKey);
    void fetch(`/api/dashboard/widgets/alerts.card/data?config=${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok && j.data) setData(j.data as AlertCardPayload);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configKey]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="skeleton-shimmer h-24 w-full rounded-xl" />
      </div>
    );
  }

  const payload = data ?? {
    categoryLabel: "Alerta",
    headline: "Sem dados",
    description: "Não foi possível carregar este alerta.",
    badgeTone: "info" as const
  };

  const props = { data: payload, visual, layout, displaySize };

  if (displaySize === "minimal" && parsed.template !== "brain_progress") {
    return <AlertCompactTemplate {...props} />;
  }

  switch (parsed.template) {
    case "brain_insight":
      return <AlertBrainInsightTemplate {...props} />;
    case "brain_progress":
      return <AlertBrainProgressTemplate {...props} />;
    case "compact":
      return <AlertCompactTemplate {...props} />;
    case "metric_threshold":
    default:
      return <AlertMetricThresholdTemplate {...props} />;
  }
}

export function AlertCardPreview({
  config,
  previewSize = "full"
}: {
  config: AlertWidgetConfig | Record<string, unknown>;
  previewSize?: "minimal" | "compact" | "full";
}) {
  const parsed = parseAlertWidgetConfig(config as Record<string, unknown>);
  const appDark = useAppDarkMode();
  const visual = useMemo(
    () => resolveAlertThemeForApp(parsed.visual, appDark),
    [parsed.visual, appDark]
  );
  const mock: AlertCardPayload = {
    categoryLabel: "Alerta de aprendizado",
    headline: "Públicos lookalike 1% entregam 37% mais conversões",
    description: "Insight detectado pelo Brain com base nos últimos 14 dias.",
    badgeLabel: "Impacto alto",
    badgeTone: "critical",
    confidenceLabel: "Confiança: 92%",
    deltaLabel: "+37%",
    deltaTrend: "up",
    metricValue: "2,38",
    metricLabel: "ROAS",
    thresholdLabel: "Meta 3,50",
    series: Array.from({ length: 10 }, (_, i) => ({ date: `${i + 1}`, value: 30 + i * 3 })),
    comparisonSeries: Array.from({ length: 10 }, (_, i) => ({ date: `${i + 1}`, value: 25 + i * 2 })),
    progressPercent: 62,
    progressHint: "Estimativa: 3 dias",
    status: "monitoring"
  };
  const layout = resolveAlertLayout(parsed.visual, previewSize === "full" ? 8 : previewSize === "compact" ? 5 : 3, previewSize === "full" ? 4 : previewSize === "compact" ? 3 : 2);
  const displaySize = previewSize;
  const props = { data: mock, visual, layout, displaySize };
  switch (parsed.template) {
    case "brain_insight":
      return <AlertBrainInsightTemplate {...props} />;
    case "brain_progress":
      return <AlertBrainProgressTemplate {...props} />;
    case "compact":
      return <AlertCompactTemplate {...props} />;
    default:
      return <AlertMetricThresholdTemplate {...props} />;
  }
}
