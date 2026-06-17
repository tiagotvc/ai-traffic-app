"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";

import { CampaignHeaderCell } from "@/components/CampaignHeaderCell";
import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { SyncRefreshButton } from "@/components/SyncRefreshButton";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import {
  COLUMN_I18N_KEYS,
  loadCampaignColumns,
  saveCampaignColumns,
  type CampaignColumnId
} from "@/lib/campaign-table-columns";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import { CampaignTableColumnsButton } from "@/components/CampaignTableColumnsButton";
import { CampaignTableCell, CampaignTableHead } from "@/components/campaign/CampaignTableColumns";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { CampaignTypeSelectCompact } from "@/components/CreateCampaignTypeModal";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { computeGroupTotals } from "@/lib/campaign-group-totals";
import { columnRefKey } from "@/lib/campaign-table-layout";
import { sortRowsByKey } from "@/lib/campaign-table-sort";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";

type CampaignRow = {
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
  reach?: number;
  messages?: number;
  frequency?: number;
  actionMetrics?: Record<string, number>;
  dailyBudget?: number | null;
  alertCount: number;
  hasAlert: boolean;
  status?: string;
  objective?: string | null;
  preset?: string;
};

type ClientOption = { id: string; slug: string; name: string };
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ObjectiveFilter = "ALL" | "leads" | "sales" | "traffic";

const PAGE_SIZES = [25, 50, 100, 200] as const;

/** Colunas fixas à esquerda ao rolar métricas (status + campanha). */
const STICKY_STATUS_TH =
  "sticky left-0 z-30 w-14 min-w-[3.5rem] bg-slate-50 px-2 py-2 text-center shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]";
const STICKY_STATUS_TD =
  "sticky left-0 z-20 w-14 min-w-[3.5rem] bg-white px-2 py-2.5 text-center shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)] group-hover:bg-violet-50/40";
const STICKY_NAME_TH =
  "sticky left-14 z-20 min-w-[10rem] bg-slate-50 px-4 py-2 text-left align-top shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]";
const STICKY_NAME_TD =
  "sticky left-14 z-10 min-w-[10rem] bg-white px-4 py-2.5 text-left align-top shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)] group-hover:bg-violet-50/40";
const STICKY_STATUS_TF =
  "sticky left-0 z-20 w-14 min-w-[3.5rem] bg-slate-50/95 px-2 py-2.5 text-center shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]";
const STICKY_NAME_TF =
  "sticky left-14 z-10 min-w-[10rem] bg-slate-50/95 px-4 py-2.5 text-left align-top font-semibold text-slate-800 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]";

function statusVariant(status?: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PAUSED") return "warning";
  return "neutral";
}

export function CampaignsHubClient() {
  const t = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignTypes");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const customTypesMap = useMemo(() => customTypesToMap(customTypes), [customTypes]);

  const customMetricNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of tableLayout.customMetrics) m[c.id] = c.name;
    return m;
  }, [tableLayout.customMetrics]);


  const groupKeys = useMemo(
    () => [...CAMPAIGN_PRESETS, ...customTypes.map((ct) => `custom:${ct.id}`)],
    [customTypes]
  );

  function groupLabel(key: string) {
    if (key.startsWith("custom:")) {
      const id = key.slice("custom:".length);
      return customTypes.find((t) => t.id === id)?.name ?? key;
    }
    return tPresets(key as "default");
  }

  const groupByType = true;
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [groupSorts, setGroupSorts] = useState<Record<string, { key: string; dir: "asc" | "desc" }>>({});
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<{ spend: number; conversions: number; leads: number }>({
    spend: 0,
    conversions: 0,
    leads: 0
  });
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [showZeroActivity, setShowZeroActivity] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [period, setPeriod] = useState<PeriodState>({ preset: "last7", since: "", until: "" });
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<CampaignColumnId[]>(() => loadCampaignColumns());
  const [sortKey, setSortKey] = useState<CampaignColumnId | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [, startStatusTransition] = useTransition();
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [metricsSource, setMetricsSource] = useState<"db" | "live" | "live-cached">("db");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedRow, setSelectedRow] = useState<CampaignRow | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const reloadPresets = useCallback(() => {
    return fetch("/api/campaign-presets")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPresets((prev) => ({ ...prev, ...(j.presets ?? {}) }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void reloadPresets();
  }, [reloadPresets]);

  function campaignPreset(row: CampaignRow): string {
    return presets[row.metaCampaignId] ?? row.preset ?? "default";
  }

  function mergePresetsFromResponse(j: { presets?: Record<string, string>; rows?: CampaignRow[] }) {
    const fromApi = { ...(j.presets ?? {}) };
    for (const r of j.rows ?? []) {
      if (r.preset) fromApi[r.metaCampaignId] = r.preset;
    }
    if (Object.keys(fromApi).length) {
      setPresets((prev) => ({ ...prev, ...fromApi }));
    }
  }

  function changePreset(metaCampaignId: string, preset: string) {
    setPresets((prev) => ({ ...prev, [metaCampaignId]: preset }));
    void fetch("/api/campaign-presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metaCampaignId, preset })
    });
  }

  function toggleCampaignStatus(metaCampaignId: string, currentStatus?: string) {
    const action = currentStatus === "ACTIVE" ? "pause" : "activate";
    setStatusPendingId(metaCampaignId);
    startStatusTransition(async () => {
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
          if (selectedRow?.metaCampaignId === metaCampaignId) {
            setSelectedRow((r) => (r ? { ...r, status: next } : r));
          }
        }
      } finally {
        setStatusPendingId(null);
      }
    });
  }

  function statusLabel(status?: string) {
    if (status === "ACTIVE") return t("statusActive");
    if (status === "PAUSED") return t("statusPaused");
    return t("statusInactive");
  }

  function toggleGroupSort(preset: string, key: string) {
    setGroupSorts((prev) => {
      const cur = prev[preset];
      if (cur?.key === key) {
        return { ...prev, [preset]: { key, dir: cur.dir === "asc" ? "desc" : "asc" } };
      }
      return { ...prev, [preset]: { key, dir: "desc" } };
    });
  }

  function sortGroupRows(
    list: CampaignRow[],
    preset: string,
    metricColumns: ReturnType<typeof metricsColumnsForPreset>
  ): CampaignRow[] {
    const sort = groupSorts[preset];
    if (!sort) return list;
    return sortRowsByKey(
      list,
      sort.key,
      sort.dir,
      metricColumns,
      tableLayout.customMetricsMap
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [qInput]);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as Array<{ id: string; name: string; slug?: string }>;
        setClients(
          list.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug ?? c.name.toLowerCase().replace(/\s+/g, "-")
          }))
        );
      });
  }, []);

  // Paginação e filtros no servidor. Período «hoje» busca ao vivo na Meta; histórico usa banco.
  const load = useCallback(
    (opts?: { live?: boolean; refresh?: boolean }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const reqId = ++requestIdRef.current;

      setLoading(true);
      if (!opts?.refresh) setRows([]);

      const live =
        opts?.live ??
        (period.preset === "today" || statusFilter !== "ALL" || objectiveFilter !== "ALL");
      const params = new URLSearchParams(periodStateToQuery(period));
      if (clientFilter) params.set("clientId", clientFilter);
      if (q.trim()) params.set("q", q.trim());
      if (onlyAlerts) params.set("onlyAlerts", "1");
      if (showZeroActivity) params.set("showZero", "1");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (objectiveFilter !== "ALL") params.set("objective", objectiveFilter);
      if (live) params.set("live", "1");
      if (opts?.refresh) params.set("refresh", "1");
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("dir", sortDir);
      }
      // Agrupado por tipo: traz todas as campanhas (sem paginação) para agrupar.
      if (groupByType) {
        params.set("limit", "500");
        params.set("offset", "0");
      } else {
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
      }

      fetch(`/api/campaigns/list?${params.toString()}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((j) => {
          if (reqId !== requestIdRef.current) return;
          if (j.ok === false) {
            setRows([]);
            setTotal(0);
            setEnrichError(typeof j.error === "string" ? j.error : null);
            return;
          }
          const list = (j.rows ?? []) as CampaignRow[];
          mergePresetsFromResponse(j);
          setRows(list);
          setTotal(j.total ?? list.length);
          setTotals(j.totals ?? { spend: 0, conversions: 0, leads: 0 });
          setEnrichError(j.enrichError ?? null);
          const src = j.metricsSource as string;
          setMetricsSource(
            src === "live-cached" ? "live-cached" : src === "live" ? "live" : "db"
          );
          if (selectedIdRef.current && list.some((r) => r.metaCampaignId === selectedIdRef.current)) {
            return;
          }
          setSelectedId(null);
          setSelectedSlug("");
          setSelectedRow(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
        })
        .finally(() => {
          if (reqId === requestIdRef.current) setLoading(false);
        });
    },
    [
      clientFilter,
      q,
      onlyAlerts,
      showZeroActivity,
      statusFilter,
      objectiveFilter,
      period,
      page,
      pageSize,
      sortKey,
      sortDir,
      groupByType
    ]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onReload = () => load();
    const onSync = () => {
      void reloadPresets();
      load({ live: true, refresh: true });
    };
    window.addEventListener("traffic:campaigns-reload", onReload);
    window.addEventListener("traffic-sync-done", onSync);
    return () => {
      window.removeEventListener("traffic:campaigns-reload", onReload);
      window.removeEventListener("traffic-sync-done", onSync);
    };
  }, [load, reloadPresets]);

  useEffect(() => {
    if (!selectedId) return;
    // Espera o detalhe (renderizado condicionalmente) entrar no DOM antes de rolar.
    const raf = requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pickCampaign = (r: CampaignRow) => {    setSelectedId(r.metaCampaignId);
    setSelectedSlug(r.clientSlug);
    setSelectedRow(r);
    rememberCampaign(r.metaCampaignId, r.clientSlug);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEndColumns = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumns((prev) => {
      const from = prev.indexOf(active.id as CampaignColumnId);
      const to = prev.indexOf(over.id as CampaignColumnId);
      if (from < 0 || to < 0) return prev;
      const next = arrayMove(prev, from, to);
      saveCampaignColumns(next);
      return next;
    });
  };

  const onSortColumn = (col: CampaignColumnId) => {
    setPage(1);
    if (sortKey !== col) {
      setSortKey(col);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
    }
  };

  const clientLabel =
    clientFilter === ""
      ? t("allClients")
      : clients.find((c) => c.slug === clientFilter)?.name ?? t("allClients");

  const visibleColumns = useMemo(() => {
    const hideClient = !!clientFilter;
    // Respeita a ordem definida pelo usuário (arrasta-e-solta), só ocultando "client"
    // quando há um cliente filtrado.
    return columns.filter((c) => !(hideClient && c === "client"));
  }, [columns, clientFilter]);

  const spendLabel =
    period.preset === "all" ? t("colSpendAll") : period.preset === "today" ? t("colSpendToday") : t("colSpend");

  function renderCell(col: CampaignColumnId, r: CampaignRow) {
    const center = "px-3 py-3 text-center tabular-nums";
    switch (col) {
      case "campaign":
        return (
          <td key={col} className="max-w-md px-4 py-3 text-left align-top">
            <div className="whitespace-normal break-words font-medium text-slate-900">{r.campaignName}</div>
          </td>
        );
      case "campaignId":
        return (
          <td key={col} className={`${center} text-[10px] text-slate-400`}>
            {r.metaCampaignId}
          </td>
        );
      case "client":
        return (
          <td key={col} className={center}>
            {r.clientName}
          </td>
        );
      case "account":
        return <td key={col} className={`${center} text-slate-500`}>{r.accountLabel}</td>;
      case "spend":
        return (
          <td key={col} className={`${center} font-medium text-slate-900`}>
            {formatBRL(r.spend, locale)}
          </td>
        );
      case "conversions":
        return <td key={col} className={center}>{Math.round(r.conversions)}</td>;
      case "leads":
        return <td key={col} className={center}>{Math.round(r.leads)}</td>;
      case "cpl":
        return (
          <td key={col} className={center}>
            {r.cpl != null ? formatBRL(r.cpl, locale) : "—"}
          </td>
        );
      case "cpa":
        return (
          <td key={col} className={center}>
            {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
          </td>
        );
      case "roas":
        return <td key={col} className={center}>{formatRoas(r.roas, locale)}</td>;
      case "impressions":
        return <td key={col} className={center}>{r.impressions ?? 0}</td>;
      case "clicks":
        return <td key={col} className={center}>{r.clicks ?? 0}</td>;
      case "ctr":
        return (
          <td key={col} className={center}>
            {r.ctr != null ? formatPercent(r.ctr, 2, locale) : "—"}
          </td>
        );
      case "cpc":
        return (
          <td key={col} className={center}>
            {r.cpc != null ? formatBRL(r.cpc, locale) : "—"}
          </td>
        );
      case "cpm":
        return (
          <td key={col} className={center}>
            {r.cpm != null ? formatBRL(r.cpm, locale) : "—"}
          </td>
        );
      case "budget":
        return (
          <td key={col} className={center}>
            {r.dailyBudget != null ? formatBRL(r.dailyBudget, locale) : "—"}
          </td>
        );
      case "status":
        return (
          <td key={col} className={`${center} text-center`}>
            <Badge variant={r.status === "ACTIVE" ? "success" : "neutral"}>
              {r.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
            </Badge>
          </td>
        );
      case "alerts":
        return (
          <td key={col} className={center}>
            {r.hasAlert ? (
              <Badge variant="danger">{r.alertCount}</Badge>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </td>
        );
      default:
        return null;
    }
  }

  function renderTotalCell(col: CampaignColumnId, labelCol: CampaignColumnId) {
    const center = "px-3 py-3 text-center font-semibold tabular-nums";
    if (col === labelCol) {
      return (
        <td key={col} className="px-4 py-3 text-left font-semibold text-slate-800">
          {t("rowTotal")} ({total})
        </td>
      );
    }
    switch (col) {
      case "spend":
        return (
          <td key={col} className={`${center} text-slate-900`}>
            {formatBRL(totals.spend, locale)}
          </td>
        );
      case "conversions":
        return (
          <td key={col} className={center}>
            {Math.round(totals.conversions)}
          </td>
        );
      case "leads":
        return (
          <td key={col} className={center}>
            {Math.round(totals.leads)}
          </td>
        );
      case "cpa":
        return (
          <td key={col} className={center}>
            {totals.conversions > 0 ? formatBRL(totals.spend / totals.conversions, locale) : "—"}
          </td>
        );
      case "cpl":
        return (
          <td key={col} className={center}>
            {totals.leads > 0 ? formatBRL(totals.spend / totals.leads, locale) : "—"}
          </td>
        );
      default:
        return (
          <td key={col} className={`${center} text-slate-400`}>
            —
          </td>
        );
    }
  }

  const totalLabelCol = visibleColumns.includes("campaign") ? "campaign" : visibleColumns[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitleList")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncRefreshButton />
          <button
            type="button"
            onClick={() => load({ live: true, refresh: true })}
            className="ui-btn-secondary text-sm"
          >
            {t("refreshLive")}
          </button>
          <button
            type="button"
            onClick={() => openPanel({ clientSlug: clientFilter || selectedSlug || undefined })}
            className="ui-btn-primary text-sm"
          >
            {t("newCampaign")}
          </button>
        </div>
      </div>

      {loading && period.preset === "today" ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
          {t("loadingMetaToday")}
        </div>
      ) : null}

      {enrichError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{enrichError}</p>
          <p className="mt-1 text-amber-800">{t("enrichRateLimitHint")}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            metricsSource === "live" || metricsSource === "live-cached"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
          title={
            metricsSource === "live-cached"
              ? t("metricsLiveCachedHint")
              : metricsSource === "live"
                ? t("metricsLiveHint")
                : t("metricsDbHint")
          }
        >
          {metricsSource === "live-cached"
            ? t("metricsLiveCached")
            : metricsSource === "live"
              ? t("metricsLive")
              : t("metricsDb")}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setSelectedId(null);
              setSelectedRow(null);
              setPage(1);
            }}
            className="mt-1 min-w-[200px] rounded-xl ui-select"
          >
            <option value="">{t("allClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="text-xs text-slate-500">{t("search")}</div>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("search")}
            className="mt-1 w-full rounded-xl ui-input"
          />
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterStatus")}</div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="mt-1 min-w-[140px] rounded-xl ui-select"
          >
            <option value="ALL">{t("statusAll")}</option>
            <option value="ACTIVE">{t("statusActive")}</option>
            <option value="INACTIVE">{t("statusInactive")}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterObjective")}</div>
          <select
            value={objectiveFilter}
            onChange={(e) => {
              setObjectiveFilter(e.target.value as ObjectiveFilter);
              setPage(1);
            }}
            className="mt-1 min-w-[140px] rounded-xl ui-select"
          >
            <option value="ALL">{t("objectiveAll")}</option>
            <option value="leads">{t("objectiveLeads")}</option>
            <option value="sales">{t("objectiveSales")}</option>
            <option value="traffic">{t("objectiveTraffic")}</option>
          </select>
        </div>
        <PeriodFilter
          value={period}
          onChange={(next) => {
            setPeriod(next);
            setPage(1);
          }}
        />
        <div>
          <div className="text-xs text-slate-500">{t("pageSizeLabel")}</div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="mt-1 min-w-[100px] rounded-xl ui-select"
            title={t("pageSizeHint")}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showZeroActivity}
            onChange={(e) => {
              setShowZeroActivity(e.target.checked);
              setPage(1);
            }}
            className="accent-violet-600"
          />
          {t("showZeroActivity")}
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => {
              setOnlyAlerts(e.target.checked);
              setPage(1);
            }}
            className="accent-violet-600"
          />
          {t("onlyAlerts")}
        </label>
        <CampaignTableColumnsButton />
      </div>

      {clientFilter ? (
        <p className="text-xs text-violet-800">
          {t("clientScopeHint", { client: clientLabel })}
        </p>
      ) : null}

      {groupByType ? (
        <div className={`space-y-4 ${loading && rows.length > 0 ? "opacity-60 pointer-events-none" : ""}`}>
          {loading && rows.length === 0 ? (
            <TableSkeleton
              rows={6}
              columns={["wide", "text", "badge", "select", "metric", "metric", "metric"]}
            />
          ) : rows.length === 0 ? (
            <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
          ) : (
            groupKeys.map((preset) => {
              const list = rows.filter((r) => campaignPreset(r) === preset);
              if (!list.length) return null;
              const groupMetricColumns = metricsColumnsForPreset(preset, customTypesMap);
              const groupSort = groupSorts[preset];
              const sorted = sortGroupRows(list, preset, groupMetricColumns);
              const groupTotals = computeGroupTotals(
                sorted,
                groupMetricColumns,
                tableLayout.customMetricsMap
              );
              return (
                <div key={preset} className="ui-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">
                      {groupLabel(preset)}{" "}
                      <span className="font-normal text-slate-400">({list.length})</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "status")}
                              className="hover:text-slate-700"
                            >
                              {t("colStatus")}
                              {groupSort?.key === "status"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "name")}
                              className="hover:text-slate-700"
                            >
                              {t("colCampaign")}
                              {groupSort?.key === "name"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "client")}
                              className="hover:text-slate-700"
                            >
                              {t("colClient")}
                              {groupSort?.key === "client"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-center">{tPresets("label")}</th>
                          <CampaignTableHead
                            columns={groupMetricColumns}
                            customMetricNames={customMetricNames}
                            sortKey={groupSort?.key}
                            sortDir={groupSort?.dir}
                            onSort={(key) => toggleGroupSort(preset, key)}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => (
                          <tr
                            key={r.metaCampaignId}
                            className="group border-t border-slate-100 hover:bg-violet-50/40"
                          >
                            <td className={STICKY_STATUS_TD}>
                              <CampaignStatusToggle
                                active={r.status === "ACTIVE"}
                                disabled={statusPendingId === r.metaCampaignId}
                                ariaLabel={statusLabel(r.status)}
                                onChange={() => toggleCampaignStatus(r.metaCampaignId, r.status)}
                              />
                            </td>
                            <td className={STICKY_NAME_TD}>
                              <button
                                type="button"
                                onClick={() => pickCampaign(r)}
                                className="block w-full whitespace-normal break-words text-left font-medium text-slate-800 hover:text-violet-700 hover:underline"
                              >
                                {r.campaignName}
                              </button>
                            </td>
                            <td className="truncate px-3 py-2.5 text-center text-slate-600">{r.clientName}</td>
                            <td className="relative px-3 py-2.5 text-center">
                              <CampaignTypeSelectCompact
                                value={campaignPreset(r)}
                                customTypes={customTypes}
                                onChange={(p) => changePreset(r.metaCampaignId, p)}
                              />
                            </td>
                            {groupMetricColumns.map((col) => (
                              <CampaignTableCell
                                key={columnRefKey(col)}
                                col={col}
                                row={r}
                                customMetrics={tableLayout.customMetricsMap}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
                        <tr>
                          <td className={`${STICKY_STATUS_TF} text-slate-400`}>—</td>
                          <td className={STICKY_NAME_TF}>
                            {t("rowTotal")} ({list.length})
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                          {groupMetricColumns.map((col) => {
                            const key = columnRefKey(col);
                            const val = groupTotals[key];
                            let content = "—";
                            if (val != null && col.kind === "metric") {
                              content = formatMetricValue(col.key, val, locale);
                            } else if (val != null && col.kind === "custom") {
                              const fmt = tableLayout.customMetricsMap[col.id]?.format ?? "number";
                              if (fmt === "currency") content = formatBRL(val, locale);
                              else if (fmt === "percent") content = formatPercent(val, 2, locale);
                              else if (fmt === "multiplier") content = formatRoas(val, locale);
                              else content = String(Math.round(val * 100) / 100);
                            } else if (val != null) {
                              content = String(val);
                            }
                            return (
                              <td
                                key={key}
                                className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-900"
                              >
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEndColumns}
                >
                  <SortableContext items={visibleColumns} strategy={horizontalListSortingStrategy}>
                    {visibleColumns.map((col) => (
                      <CampaignHeaderCell
                        key={col}
                        col={col}
                        label={col === "spend" ? spendLabel : t(COLUMN_I18N_KEYS[col] as "colCampaign")}
                        sortActive={sortKey === col}
                        sortDir={sortDir}
                        onSort={onSortColumn}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {visibleColumns.map((col) => (
                      <td key={col} className="px-3 py-3 first:pl-4">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (                  <tr
                    key={r.metaCampaignId}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-violet-50/40 ${
                      selectedId === r.metaCampaignId ? "bg-violet-50/60" : ""
                    }`}
                    onClick={() => pickCampaign(r)}
                  >
                    {visibleColumns.map((col) => renderCell(col, r))}
                  </tr>
                ))
              )}
            </tbody>
            {loading ? (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
                <tr>
                  {visibleColumns.map((col) => (
                    <td key={col} className="px-3 py-3 first:pl-4">
                      <Skeleton className="h-4 w-full max-w-[80px]" />
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : rows.length > 0 ? (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
                <tr>
                  {visibleColumns.map((col) => renderTotalCell(col, totalLabelCol))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            {t("pagination", {
              from: total ? (page - 1) * pageSize + 1 : 0,
              to: Math.min(page * pageSize, total),
              total
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="ui-btn-secondary min-w-[2.25rem] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("pagePrev")}
            >
              ‹
            </button>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="ui-btn-secondary min-w-[2.25rem] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("pageNext")}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      )}

      {selectedId ? (
        <div ref={detailRef} className="space-y-2 scroll-mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">{t("detailTitle")}</h2>
            <Link
              href={`/campaigns/${selectedId}?client=${encodeURIComponent(selectedSlug)}`}
              className="text-xs font-medium text-violet-600 underline"
            >
              {t("openFullPage")}
            </Link>
          </div>
          <CampaignManagerClient
            key={selectedId}
            metaCampaignId={selectedId}
            clientSlug={selectedSlug}
            tab="overview"
            embedded
            seedRow={selectedRow ?? undefined}
            periodQuery={(() => {
              const qs = periodStateToQuery(period).toString();
              return qs ? `?${qs}` : "";
            })()}
          />
        </div>
      ) : total > 0 ? (
        <p className="text-center text-sm text-slate-500">{t("pickRowHint")}</p>
      ) : (
        <div className="ui-card space-y-4 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">{t("emptyTitle")}</p>
          <p className="mx-auto max-w-lg text-sm text-slate-500">{t("emptyExplain")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => openPanel()} className="ui-btn-primary">
              {t("createFirst")}
            </button>
            <button
              type="button"
              onClick={() =>
                fetch("/api/sync/run", { method: "POST" }).then(() => load({ live: true }))
              }
              className="ui-btn-secondary"
            >
              {t("syncNow")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
