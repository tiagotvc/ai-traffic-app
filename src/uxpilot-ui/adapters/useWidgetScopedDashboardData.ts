"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { periodStateFromWidgetPreset } from "@/lib/dashboard/widget-period";
import { buildQuery, resolveRanges } from "@/lib/dashboard-ranges";
import { formatPeriodLabel, periodStateToParsed } from "@/lib/report-period";
import type { PeriodPreset } from "@/lib/report-period";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;
type Summary = Partial<Record<MetricKey, number>>;
type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

export function useWidgetScopedDashboardData(
  base: DashboardData,
  periodPreset: PeriodPreset | null
): DashboardData & { widgetPeriodPreset?: PeriodPreset | null } {
  const tPeriod = useTranslations("period");
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const clientFilter = strip?.clientFilter ?? "";
  const accountFilter = strip?.accountFilter ?? "";

  const [override, setOverride] = useState<{
    summary: Summary | null;
    prevSummary: Summary | null;
    series: SeriesPoint[];
    loading: boolean;
  } | null>(null);

  const periodKey = periodPreset ?? "global";

  useEffect(() => {
    if (!periodPreset) {
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

    const period = periodStateFromWidgetPreset(periodPreset);
    const tz = base.activeTz;

    void (async () => {
      try {
        const { current, previous } = resolveRanges(period, tz);
        const curQ = buildQuery(clientFilter, accountFilter, current);
        const [sRes, tRes, pRes] = await Promise.all([
          fetch(`/api/dashboard/summary?${curQ}`),
          fetch(`/api/dashboard/timeseries?${curQ}`),
          previous
            ? fetch(`/api/dashboard/summary?${buildQuery(clientFilter, accountFilter, previous)}`)
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
  }, [periodPreset, periodKey, clientFilter, accountFilter, base.activeTz]);

  const periodLabel = useMemo(() => {
    if (!periodPreset) return base.vsLabel;
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
      custom: tPeriod("custom"),
      all: tPeriod("all")
    };
    return formatPeriodLabel(
      periodStateToParsed(periodStateFromWidgetPreset(periodPreset)),
      locale,
      labels
    );
  }, [periodPreset, base.vsLabel, locale, tPeriod]);

  if (!periodPreset) {
    return { ...base, widgetPeriodPreset: null };
  }

  return {
    ...base,
    widgetPeriodPreset: periodPreset,
    summary: override?.summary ?? base.summary,
    prevSummary: override?.prevSummary ?? base.prevSummary,
    series: override?.series ?? [],
    loading: override?.loading ?? true,
    vsLabel: periodLabel
  };
}
