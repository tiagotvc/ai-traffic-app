"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, TrendingUp, Zap } from "lucide-react";

import AlertsContent from "@/uxpilot-ui/pages/content/Alerts";

type VariationItem = {
  id: string;
  entityName: string | null;
  clientSlug: string | null;
  metric: string;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
};

function mapAlert(item: VariationItem, metricLabel: (m: string) => string, locale: string) {
  const type =
    item.severity === "critical" ? "critical" : item.severity === "positive" ? "win" : "warning";
  const icon =
    type === "critical" ? AlertTriangle : type === "win" ? TrendingUp : type === "warning" ? Zap : Info;
  const color =
    type === "critical" ? "#ef4444" : type === "win" ? "#10b981" : type === "warning" ? "#f5a623" : "#4f46e5";
  const bg =
    type === "critical"
      ? "rgba(239,68,68,0.06)"
      : type === "win"
        ? "rgba(16,185,129,0.06)"
        : type === "warning"
          ? "rgba(245,166,35,0.06)"
          : "rgba(79,70,229,0.06)";
  const border =
    type === "critical"
      ? "rgba(239,68,68,0.2)"
      : type === "win"
        ? "rgba(16,185,129,0.18)"
        : type === "warning"
          ? "rgba(245,166,35,0.2)"
          : "rgba(79,70,229,0.18)";

  const sign = item.deltaPct >= 0 ? "+" : "";
  return {
    id: item.id,
    type,
    icon,
    title: item.entityName ?? "Alerta",
    detail: `${metricLabel(item.metric)} · ${sign}${item.deltaPct.toFixed(1)}%`,
    time: "recente",
    client: item.entityName ?? "—",
    read: false,
    color,
    bg,
    border
  };
}

export function AlertsContentLive() {
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [items, setItems] = useState<VariationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/alerts/variations?days=30&level=client")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const alerts = useMemo(
    () =>
      items.map((item) =>
        mapAlert(item, (m) => {
          try {
            return tMetrics(m as "spend");
          } catch {
            return m;
          }
        }, locale)
      ),
    [items, tMetrics, locale]
  );

  return <AlertsContent live={{ alerts, loading }} />;
}
