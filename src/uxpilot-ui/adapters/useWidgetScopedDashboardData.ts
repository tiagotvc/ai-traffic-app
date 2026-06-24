"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useClientViewOptional } from "@/components/dashboard/canvas/ClientViewContext";
import { useAppCanvasScope } from "@/components/dashboard/canvas/AppCanvasScopeContext";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { periodStateFromWidgetPreset } from "@/lib/dashboard/widget-period";
import type { ExtendedPeriodPreset } from "@/lib/dashboard/extended-period";
import { buildQuery, resolveRanges } from "@/lib/dashboard-ranges";
import { formatPeriodLabel, periodStateToParsed } from "@/lib/report-period";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;
type Summary = Partial<Record<MetricKey, number>>;
type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

export function useWidgetScopedDashboardData(
  base: DashboardData,
  periodPreset: ExtendedPeriodPreset | null
): DashboardData & { widgetPeriodPreset?: ExtendedPeriodPreset | null } {
  const tPeriod = useTranslations("period");
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const clientView = useClientViewOptional();
  const canvasScope = useAppCanvasScope();
  const effectivePeriod =
    periodPreset ?? (canvasScope.hasFilterBlock ? canvasScope.periodPreset : null);
  const clientFilter = canvasScope.hasFilterBlock
    ? canvasScope.clientFilter
    : (strip?.clientFilter ?? "");
  const accountFilter = canvasScope.hasFilterBlock
    ? canvasScope.accountFilter
    : (strip?.accountFilter ?? "");

  const [override, setOverride] = useState<{
    summary: Summary | null;
    prevSummary: Summary | null;
    series: SeriesPoint[];
    loading: boolean;
  } | null>(null);

  const periodKey = effectivePeriod ?? "global";

  useEffect(() => {
    if (!effectivePeriod) {
      setOverride(null);
      return;
    }

    let cancelled = false;
    setOverride((cur) => ({
      summary: cur?.summary ?? null,
      prevSummary: cur?.prevSummary ?? null,
      series: cur?.series ?? [],
      loading: true
    }));

    const period = periodStateFromWidgetPreset(effectivePeriod);
    const tz = base.activeTz;

    void (async () => {
      try {
        const { current, previous } = resolveRanges(period, tz);
        const curQ = buildQuery(clientFilter, accountFilter, current);
        const viewSuffix = clientView?.viewToken
          ? `${curQ ? "&" : ""}viewToken=${encodeURIComponent(clientView.viewToken)}`
          : "";
        const [sRes, tRes, pRes] = await Promise.all([
          fetch(`/api/dashboard/summary?${curQ}${viewSuffix}`),
          fetch(`/api/dashboard/timeseries?${curQ}${viewSuffix}`),
          previous
            ? fetch(
                `/api/dashboard/summary?${buildQuery(clientFilter, accountFilter, previous)}${viewSuffix}`
              )
            : Promise.resolve<Response | null>(null)
        ]);

        const parseJson = async (res: Response) => {
          const text = await res.text();
          return JSON.parse(text) as Record<string, unknown>;
        };

        const sJson = await parseJson(sRes);
        const tJson = await parseJson(tRes);
        const pJson = pRes ? await parseJson(pRes) : null;

        if (cancelled) return;
        setOverride({
          summary: (sJson.summary as Summary) ?? {},
          prevSummary: (pJson?.summary as Summary) ?? null,
          series: (tJson.series as SeriesPoint[]) ?? [],
          loading: false
        });
      } catch {
        if (!cancelled) {
          setOverride({
            summary: null,
            prevSummary: null,
            series: [],
            loading: false
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectivePeriod, periodKey, clientFilter, accountFilter, base.activeTz, clientView?.viewToken]);

  const periodLabel = useMemo(() => {
    if (!effectivePeriod) return base.vsLabel;
    const labels = {
      today: tPeriod("today"),
      yesterday: tPeriod("yesterday"),
      thisWeek: tPeriod("thisWeek"),
      thisMonth: tPeriod("thisMonth"),
      thisQuarter: tPeriod("thisQuarter"),
      last7: tPeriod("last7"),
      last14: tPeriod("last14"),
      last15: tPeriod("last15"),
      last30: tPeriod("last30"),
      last21: tPeriod("last21"),
      last60: tPeriod("last60"),
      last90: tPeriod("last90"),
      last180: tPeriod("last180"),
      last365: tPeriod("last365"),
      last730: tPeriod("last730"),
      custom: tPeriod("custom"),
      all: tPeriod("all")
    };
    return formatPeriodLabel(
      periodStateToParsed(periodStateFromWidgetPreset(effectivePeriod)),
      locale,
      labels
    );
  }, [effectivePeriod, base.vsLabel, locale, tPeriod]);

  if (!effectivePeriod) {
    return { ...base, widgetPeriodPreset: null };
  }

  return {
    ...base,
    widgetPeriodPreset: effectivePeriod,
    summary: override?.summary ?? base.summary,
    prevSummary: override?.prevSummary ?? base.prevSummary,
    series: override?.series ?? [],
    loading: override?.loading ?? true,
    vsLabel: periodLabel
  };
}
