"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";

type SeriesPoint = { day: string; spend?: number; conversions?: number; roas?: number };
type Summary = { spend?: number; conversions?: number; roas?: number; cpl?: number; cpa?: number };
type ScheduleRow = {
  id: string;
  name: string;
  clientName: string | null;
  format: string;
  frequency: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
};
type CampaignLite = { clientName: string; spend: number };

const EMPTY_PERIOD: PeriodState = { preset: "last30", since: "", until: "" };
const PIE_COLORS = ["#4f46e5", "#f5a623", "#10b981", "#7c3aed", "#ef4444", "#0ea5e9"];

export function useReportsData() {
  const strip = useCommandStripOptional();
  const clientFilter = strip?.clientFilter ?? "";
  const period = strip?.period ?? EMPTY_PERIOD;
  const periodKey = `${period.preset}|${period.since}|${period.until}`;

  const [summary, setSummary] = useState<Summary>({});
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignLite[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    const params = new URLSearchParams(periodStateToQuery(period));
    if (clientFilter) params.set("clientId", clientFilter);
    params.set("days", "150");

    const listParams = new URLSearchParams(periodStateToQuery(period));
    if (clientFilter) listParams.set("clientId", clientFilter);
    listParams.set("limit", "500");

    Promise.all([
      fetch(`/api/dashboard/summary?${params.toString()}`, { signal: ac.signal }).then((r) => r.json()),
      fetch(`/api/dashboard/timeseries?${params.toString()}`, { signal: ac.signal }).then((r) => r.json()),
      fetch("/api/report-schedules", { signal: ac.signal }).then((r) => r.json()),
      fetch(`/api/campaigns/list?${listParams.toString()}`, { signal: ac.signal }).then((r) => r.json())
    ])
      .then(([sumJ, tsJ, schJ, campJ]) => {
        setSummary((sumJ.summary ?? sumJ.totals ?? {}) as Summary);
        setSeries((tsJ.series ?? []) as SeriesPoint[]);
        setSchedules((schJ.schedules ?? []) as ScheduleRow[]);
        const rows = (campJ.rows ?? []) as Array<{ clientName?: string; spend?: number }>;
        setCampaigns(rows.map((r) => ({ clientName: r.clientName ?? "—", spend: r.spend ?? 0 })));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSummary({});
        setSeries([]);
        setSchedules([]);
        setCampaigns([]);
      })
      .finally(() => setLoading(false));
  }, [clientFilter, periodKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, series, schedules, campaigns, loading, reload: load, pieColors: PIE_COLORS };
}
