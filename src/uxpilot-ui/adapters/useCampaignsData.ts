"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { PeriodState } from "@/components/PeriodFilter";
import { periodStateToQuery } from "@/components/PeriodFilter";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { shouldCampaignListFetchLive } from "@/lib/campaign-list-live";

import type {
  ObjectiveFilter,
  StatusFilter
} from "@/uxpilot-ui/adapters/UxCampaignFiltersPanel";

export type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  accountLabel: string;
  metaAdAccountId?: string;
  spend: number;
  conversions: number;
  leads: number;
  cpl: number | null;
  cpa: number | null;
  roas: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  frequency?: number;
  dailyBudget?: number | null;
  alertCount: number;
  messages?: number;
  reach?: number;
  actionMetrics?: Record<string, number>;
  status?: string;
  objective?: string | null;
  preset?: string;
};

export type CampaignTotals = { spend: number; conversions: number; leads: number };

export type CampaignsDataFilters = {
  q: string;
  statusFilter: StatusFilter;
  objectiveFilter: ObjectiveFilter;
  onlyAlerts: boolean;
  showZeroActivity: boolean;
  pageSize: number;
  page: number;
  groupByType?: boolean;
};

const EMPTY_PERIOD: PeriodState = { preset: "last7", since: "", until: "" };

const DEFAULT_FILTERS: CampaignsDataFilters = {
  q: "",
  statusFilter: "ALL",
  objectiveFilter: "ALL",
  onlyAlerts: false,
  showZeroActivity: false,
  pageSize: 50,
  page: 1
};

export function useCampaignsData(filters: CampaignsDataFilters = DEFAULT_FILTERS) {
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const clientFilter = strip?.clientFilter ?? "";
  const stripPeriod = strip?.period;
  const period = stripPeriod ?? EMPTY_PERIOD;
  const periodRef = useRef(period);
  periodRef.current = period;
  const periodKey = `${period.preset}|${period.since}|${period.until}`;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filtersKey = JSON.stringify(filters);

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [totals, setTotals] = useState<CampaignTotals>({ spend: 0, conversions: 0, leads: 0 });
  const [total, setTotal] = useState(0);
  const [metricsSource, setMetricsSource] = useState<"db" | "live" | "live-cached">("db");
  const [loading, setLoading] = useState(true);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    const f = filtersRef.current;
    const params = new URLSearchParams(periodStateToQuery(periodRef.current));
    if (clientFilter) params.set("clientId", clientFilter);
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.onlyAlerts) params.set("onlyAlerts", "1");
    if (f.showZeroActivity) params.set("showZero", "1");
    if (f.statusFilter !== "ALL") params.set("status", f.statusFilter);
    if (f.objectiveFilter !== "ALL") params.set("objective", f.objectiveFilter);

    const live = shouldCampaignListFetchLive({
      clientFilter,
      periodUserActivated: strip?.periodUserActivated ?? false
    });
    if (live) params.set("live", "1");
    if (f.objectiveFilter !== "ALL" && !live) params.set("metadata", "1");

    if (f.groupByType) {
      params.set("limit", "500");
      params.set("offset", "0");
    } else {
      params.set("limit", String(f.pageSize));
      params.set("offset", String((f.page - 1) * f.pageSize));
    }

    fetch(`/api/campaigns/list?${params.toString()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok === false) {
          setRows([]);
          setTotals({ spend: 0, conversions: 0, leads: 0 });
          setTotal(0);
          return;
        }
        setRows((j.rows ?? []) as CampaignRow[]);
        setTotals(j.totals ?? { spend: 0, conversions: 0, leads: 0 });
        setTotal(Number(j.total ?? j.rows?.length ?? 0));
        setMetricsSource(j.metricsSource ?? "db");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [clientFilter, periodKey, filtersKey, strip?.periodUserActivated]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onReload = () => load();
    const onSync = () => load();
    window.addEventListener("traffic:campaigns-reload", onReload);
    window.addEventListener("traffic-sync-done", onSync);
    return () => {
      window.removeEventListener("traffic:campaigns-reload", onReload);
      window.removeEventListener("traffic-sync-done", onSync);
    };
  }, [load]);

  const toggleStatus = useCallback(
    (metaCampaignId: string, currentStatus?: string) => {
      const action = currentStatus === "ACTIVE" ? "pause" : "activate";
      setStatusPendingId(metaCampaignId);
      startTransition(async () => {
        try {
          const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action })
          });
          const j = await res.json();
          if (j.ok) {
            const next = action === "activate" ? "ACTIVE" : "PAUSED";
            setRows((prev) =>
              prev.map((r) => (r.metaCampaignId === metaCampaignId ? { ...r, status: next } : r))
            );
          } else {
            window.alert(String(j.error ?? "Erro ao alterar status"));
          }
        } finally {
          setStatusPendingId(null);
        }
      });
    },
    [clientFilter, periodKey]
  );

  return {
    rows,
    totals,
    total,
    metricsSource,
    loading,
    locale,
    toggleStatus,
    statusPendingId,
    reload: load
  };
}
