"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";

import { CampaignColumnsPicker } from "@/components/CampaignColumnsPicker";
import { CampaignHeaderCell } from "@/components/CampaignHeaderCell";
import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { SyncRefreshButton } from "@/components/SyncRefreshButton";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import {
  COLUMN_I18N_KEYS,
  loadCampaignColumns,
  loadCampaignColumnWidths,
  saveCampaignColumns,
  saveCampaignColumnWidths,
  type CampaignColumnId,
  type CampaignColumnWidths
} from "@/lib/campaign-table-columns";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CAMPAIGN_PRESETS, presetMetricsFor } from "@/lib/campaign-presets";

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
  dailyBudget?: number | null;
  alertCount: number;
  hasAlert: boolean;
  status?: string;
  objective?: string | null;
};

function campaignMetricValue(r: CampaignRow, key: MetricKey): number {
  switch (key) {
    case "spend":
      return r.spend;
    case "conversions":
      return r.conversions;
    case "roas":
      return r.roas;
    case "cpa":
      return r.cpa ?? 0;
    case "ctr":
      return r.ctr ?? 0;
    case "cpc":
      return r.cpc ?? 0;
    case "cpm":
      return r.cpm ?? 0;
    case "messages":
      return r.messages ?? 0;
    case "reach":
      return r.reach ?? 0;
    case "impressions":
      return r.impressions ?? 0;
    case "clicks":
      return r.clicks ?? 0;
    case "frequency":
      return r.frequency ?? 0;
    default:
      return 0;
  }
}

type ClientOption = { id: string; slug: string; name: string };
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ObjectiveFilter = "ALL" | "leads" | "sales" | "traffic";

const PAGE_SIZES = [25, 50, 100, 200] as const;

export function CampaignsHubClient() {
  const t = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const [groupByType, setGroupByType] = useState(false);
  const [presets, setPresets] = useState<Record<string, string>>({});
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
  const [showZeroActivity, setShowZeroActivity] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [period, setPeriod] = useState<PeriodState>({ preset: "last7", since: "", until: "" });
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<CampaignColumnId[]>(() => loadCampaignColumns());
  const [columnWidths, setColumnWidths] = useState<CampaignColumnWidths>(() => loadCampaignColumnWidths());
  const [sortKey, setSortKey] = useState<CampaignColumnId | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const resizing = useRef<{ col: CampaignColumnId; startX: number; startW: number } | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetch("/api/campaign-presets")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPresets(j.presets ?? {});
      })
      .catch(() => {});
  }, []);

  function changePreset(metaCampaignId: string, preset: string) {
    setPresets((prev) => ({ ...prev, [metaCampaignId]: preset }));
    void fetch("/api/campaign-presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metaCampaignId, preset })
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [qInput]);

  useEffect(() => {
    fetch("/api/clients")
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
      setRows([]);

      const live = opts?.live ?? period.preset === "today";
      const params = new URLSearchParams(periodStateToQuery(period));
      if (clientFilter) params.set("clientId", clientFilter);
      if (q.trim()) params.set("q", q.trim());
      if (onlyAlerts) params.set("onlyAlerts", "1");
      if (!showZeroActivity) params.set("showZero", "0");
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

  useEffect(() => {    load();
    const onReload = () => load();
    const onSync = () => load({ live: period.preset === "today", refresh: true });
    window.addEventListener("traffic:campaigns-reload", onReload);
    window.addEventListener("traffic-sync-done", onSync);
    return () => {
      window.removeEventListener("traffic:campaigns-reload", onReload);
      window.removeEventListener("traffic-sync-done", onSync);
    };
  }, [load]);

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

  const onResizeStart = useCallback(
    (col: CampaignColumnId, e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const th = (e.currentTarget as HTMLElement).closest("th");
      const startW = columnWidths[col] ?? th?.getBoundingClientRect().width ?? 160;
      resizing.current = { col, startX: e.clientX, startW: Math.round(startW) };

      const onMove = (ev: PointerEvent) => {
        if (!resizing.current) return;
        const delta = ev.clientX - resizing.current.startX;
        const w = Math.max(80, Math.round(resizing.current.startW + delta));
        setColumnWidths((prev) => ({ ...prev, [resizing.current!.col]: w }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        resizing.current = null;
        setColumnWidths((prev) => {
          saveCampaignColumnWidths(prev);
          return prev;
        });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [columnWidths]
  );

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
    switch (col) {
      case "campaign":
        return (
          <td key={col} className="px-4 py-3">
            <div className="font-medium text-slate-900">{r.campaignName}</div>
          </td>
        );
      case "campaignId":
        return (
          <td key={col} className="px-3 py-3 text-[10px] text-slate-400">
            {r.metaCampaignId}
          </td>
        );
      case "client":
        return (
          <td key={col} className="px-3 py-3">
            {r.clientName}
          </td>
        );
      case "account":
        return <td key={col} className="px-3 py-3 text-slate-500">{r.accountLabel}</td>;
      case "spend":
        return (
          <td key={col} className="px-3 py-3 font-medium">
            {formatBRL(r.spend, locale)}
          </td>
        );
      case "conversions":
        return <td key={col} className="px-3 py-3">{Math.round(r.conversions)}</td>;
      case "leads":
        return <td key={col} className="px-3 py-3">{Math.round(r.leads)}</td>;
      case "cpl":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpl != null ? formatBRL(r.cpl, locale) : "—"}
          </td>
        );
      case "cpa":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
          </td>
        );
      case "roas":
        return <td key={col} className="px-3 py-3">{formatRoas(r.roas, locale)}</td>;
      case "impressions":
        return <td key={col} className="px-3 py-3">{r.impressions ?? 0}</td>;
      case "clicks":
        return <td key={col} className="px-3 py-3">{r.clicks ?? 0}</td>;
      case "ctr":
        return (
          <td key={col} className="px-3 py-3">
            {r.ctr != null ? formatPercent(r.ctr, 1, locale) : "—"}
          </td>
        );
      case "cpc":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpc != null ? formatBRL(r.cpc, locale) : "—"}
          </td>
        );
      case "cpm":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpm != null ? formatBRL(r.cpm, locale) : "—"}
          </td>
        );
      case "budget":
        return (
          <td key={col} className="px-3 py-3">
            {r.dailyBudget != null ? formatBRL(r.dailyBudget, locale) : "—"}
          </td>
        );
      case "status":
        return (
          <td key={col} className="px-3 py-3">
            <Badge variant={r.status === "ACTIVE" ? "success" : "neutral"}>
              {r.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
            </Badge>
          </td>
        );
      case "alerts":
        return (
          <td key={col} className="px-3 py-3">
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
    if (col === labelCol) {
      return (
        <td key={col} className="px-4 py-3 font-semibold text-slate-800">
          {t("rowTotal")} ({total})
        </td>
      );
    }
    switch (col) {
      case "spend":
        return (
          <td key={col} className="px-3 py-3 font-semibold text-slate-900">
            {formatBRL(totals.spend, locale)}
          </td>
        );
      case "conversions":
        return (
          <td key={col} className="px-3 py-3 font-semibold">
            {Math.round(totals.conversions)}
          </td>
        );
      case "leads":
        return (
          <td key={col} className="px-3 py-3 font-semibold">
            {Math.round(totals.leads)}
          </td>
        );
      case "cpa":
        return (
          <td key={col} className="px-3 py-3 font-semibold">
            {totals.conversions > 0 ? formatBRL(totals.spend / totals.conversions, locale) : "—"}
          </td>
        );
      case "cpl":
        return (
          <td key={col} className="px-3 py-3 font-semibold">
            {totals.leads > 0 ? formatBRL(totals.spend / totals.leads, locale) : "—"}
          </td>
        );
      default:
        return (
          <td key={col} className="px-3 py-3 text-slate-400">
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
            onClick={() => setGroupByType((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              groupByType
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t("groupByType")}
          </button>
          {!groupByType ? <CampaignColumnsPicker onChange={setColumns} /> : null}
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
      </div>

      {clientFilter ? (
        <p className="text-xs text-violet-800">
          {t("clientScopeHint", { client: clientLabel })}
        </p>
      ) : null}

      {groupByType ? (
        <div className="space-y-4">
          {loading ? (
            <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
          ) : (
            CAMPAIGN_PRESETS.map((preset) => {
              const list = rows.filter(
                (r) => (presets[r.metaCampaignId] ?? "default") === preset
              );
              if (!list.length) return null;
              const metrics = presetMetricsFor(preset);
              return (
                <div key={preset} className="ui-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">
                      {tPresets(preset)}{" "}
                      <span className="font-normal text-slate-400">({list.length})</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2">{t("colCampaign")}</th>
                          <th className="px-3 py-2">{t("colClient")}</th>
                          <th className="px-3 py-2">{tPresets("label")}</th>
                          {metrics.map((m) => (
                            <th key={m} className="px-3 py-2 text-right">
                              {tMetrics(METRIC_BY_KEY[m].label)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
                          <tr
                            key={r.metaCampaignId}
                            className="border-t border-slate-100 hover:bg-violet-50/40"
                          >
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => pickCampaign(r)}
                                className="text-left font-medium text-slate-800 hover:text-violet-700 hover:underline"
                              >
                                {r.campaignName}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{r.clientName}</td>
                            <td className="px-3 py-2.5">
                              <select
                                value={presets[r.metaCampaignId] ?? "default"}
                                onChange={(e) => changePreset(r.metaCampaignId, e.target.value)}
                                className="ui-select !w-auto !py-1.5 text-xs"
                              >
                                {CAMPAIGN_PRESETS.map((p) => (
                                  <option key={p} value={p}>
                                    {tPresets(p)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {metrics.map((m) => (
                              <td
                                key={m}
                                className="px-3 py-2.5 text-right tabular-nums text-slate-700"
                              >
                                {formatMetricValue(m, campaignMetricValue(r, m), locale)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <colgroup>
              {visibleColumns.map((col) => (
                <col
                  key={col}
                  style={columnWidths[col] ? { width: `${columnWidths[col]}px` } : undefined}
                />
              ))}
            </colgroup>
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
                        onResizeStart={onResizeStart}
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
