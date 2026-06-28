"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Megaphone, Plus, Trash2, Building2, ListFilter, Target, ChevronRight, FilePenLine, FileDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { DsInfoBanner, DsPageHeader } from "@/design-system";
import { CampaignHeaderCell } from "@/components/CampaignHeaderCell";
import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { shouldCampaignListFetchLive } from "@/lib/campaign-list-live";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CampaignDraftMobileCards, CampaignMobileCards, type CampaignRowLike } from "@/components/campaigns/CampaignMobileCards";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { MetaSyncButton } from "@/components/layout/MetaSyncButton";
import { IconActionButton } from "@/components/ui/IconActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
import { FilterSearchInput } from "@/components/FilterSearchInput";
import { CampaignExportModal, toCampaignExportRows } from "@/components/campaign/CampaignExportModal";
import { CampaignGroupPager } from "@/components/campaign/CampaignGroupPager";
import { CampaignMetricsDataBanner } from "@/components/campaign/CampaignMetricsDataBanner";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { CampaignTypeSelectCompact } from "@/components/campaign/CampaignTypeSelectCompact";
import { CampaignCreationModePicker } from "@/components/campaign-creator/CampaignCreationModePicker";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { computeGroupTotals } from "@/lib/campaign-group-totals";
import { columnRefKey } from "@/lib/campaign-table-layout";
import { getCampaignPresetIconConfig } from "@/lib/campaign-preset-icons";
import { campaignMetricTone, campaignMetricToneClass } from "@/lib/campaign-table-premium";
import { sortRowsByKey } from "@/lib/campaign-table-sort";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import {
  STICKY_NAME_TD_COMPACT,
  STICKY_NAME_TF_COMPACT,
  STICKY_NAME_TH_COMPACT,
  STICKY_STATUS_TD_COMPACT,
  STICKY_STATUS_TF_COMPACT,
  STICKY_STATUS_TH_COMPACT
} from "@/lib/campaign-table-sticky";

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
  isDraft?: boolean;
  draftTemplateId?: string;
};

type ClientOption = { id: string; slug: string; name: string };
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ObjectiveFilter = "ALL" | "leads" | "sales" | "traffic";

const CAMPAIGN_GROUP_PAGE_SIZE = 10;

function statusVariant(status?: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PAUSED") return "warning";
  return "neutral";
}

function buildCampaignDetailHref(
  row: Pick<CampaignRowLike, "metaCampaignId" | "clientSlug">,
  period: PeriodState
): string {
  const params = new URLSearchParams(periodStateToQuery(period));
  params.set("client", row.clientSlug);
  const qs = params.toString();
  return `/campaigns/${row.metaCampaignId}${qs ? `?${qs}` : ""}`;
}

function isDraftRow(row: CampaignRow): boolean {
  return Boolean(row.isDraft) || row.metaCampaignId.startsWith("draft:");
}

function draftTemplateIdFromRow(row: Pick<CampaignRowLike, "metaCampaignId" | "draftTemplateId">): string {
  return row.draftTemplateId ?? row.metaCampaignId.replace(/^draft:/, "");
}

export function CampaignsHubClient({ useUxChrome = false }: { useUxChrome?: boolean } = {}) {
  const t = useTranslations("campaignsPage");
  const tCommon = useTranslations("common");
  const tSync = useTranslations("sync");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignTypes");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const strip = useCommandStripOptional();
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
  const [localClientFilter, setLocalClientFilter] = useState("");
  const [localPeriod, setLocalPeriod] = useState<PeriodState>({ preset: "last7", since: "", until: "" });
  const [localPeriodUserActivated, setLocalPeriodUserActivated] = useState(false);
  const clientFilter = useUxChrome ? (strip?.clientFilter ?? "") : localClientFilter;
  const period = useUxChrome ? (strip?.period ?? localPeriod) : localPeriod;
  const periodUserActivated = useUxChrome
    ? (strip?.periodUserActivated ?? false)
    : localPeriodUserActivated;
  const campaignDetailHref = useCallback(
    (row: Pick<CampaignRowLike, "metaCampaignId" | "clientSlug">) => buildCampaignDetailHref(row, period),
    [period]
  );
  const setClientFilter = useUxChrome
    ? (value: string) => strip?.setClientFilter(value)
    : setLocalClientFilter;
  const setPeriod = useUxChrome
    ? (value: PeriodState) => strip?.setPeriod(value)
    : (value: PeriodState) => {
        setLocalPeriodUserActivated(true);
        setLocalPeriod(value);
      };
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [showZeroActivity, setShowZeroActivity] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<CampaignColumnId[]>(() => loadCampaignColumns());
  const [sortKey, setSortKey] = useState<CampaignColumnId | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [draftDiscardPendingId, setDraftDiscardPendingId] = useState<string | null>(null);
  const [draftDiscardTarget, setDraftDiscardTarget] = useState<CampaignRowLike | null>(null);
  const [creationPickerOpen, setCreationPickerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [, startStatusTransition] = useTransition();
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null);
  const [syncPolling, setSyncPolling] = useState(false);
  const [needsAutoSync, setNeedsAutoSync] = useState(false);
  const [syncTriggering, setSyncTriggering] = useState(false);
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

  useEffect(() => {
    const clientFromUrl = searchParams.get("client");
    if (!clientFromUrl) return;
    if (useUxChrome) {
      if (strip?.clientFilter !== clientFromUrl) strip?.setClientFilter(clientFromUrl);
    } else {
      setLocalClientFilter(clientFromUrl);
    }
  }, [searchParams, useUxChrome, strip]);

  const campaignsPageFilters = useMemo(
    () => (
      <>
        <div className="ui-filter-panel-grid__search">
          <FilterSearchInput
            size="wide"
            className="mt-0 w-full"
            label={t("search")}
            value={qInput}
            onChange={setQInput}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <FilterSelectDropdown
          className="ui-filter-panel-field"
          icon={<ListFilter size={14} />}
          label={t("filterStatus")}
          placeholder={t("statusAll")}
          value={statusFilter === "ALL" ? "" : statusFilter}
          onChange={(v) => {
            setStatusFilter((v || "ALL") as StatusFilter);
            setGroupPages({});
          }}
          options={[
            { value: "ACTIVE", label: t("statusActive") },
            { value: "INACTIVE", label: t("statusInactive") }
          ]}
        />
        <FilterSelectDropdown
          className="ui-filter-panel-field"
          icon={<Target size={14} />}
          label={t("filterObjective")}
          placeholder={t("objectiveAll")}
          value={objectiveFilter === "ALL" ? "" : objectiveFilter}
          onChange={(v) => {
            setObjectiveFilter((v || "ALL") as ObjectiveFilter);
            setGroupPages({});
          }}
          options={[
            { value: "leads", label: t("objectiveLeads") },
            { value: "sales", label: t("objectiveSales") },
            { value: "traffic", label: t("objectiveTraffic") }
          ]}
        />
      </>
    ),
    [t, qInput, statusFilter, objectiveFilter]
  );

  const displayRows = useMemo(() => {
    let list = rows;
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.campaignName.toLowerCase().includes(qq) ||
          r.metaCampaignId.toLowerCase().includes(qq) ||
          r.clientName.toLowerCase().includes(qq)
      );
    }
    return list;
  }, [rows, q]);

  const draftDisplayRows = useMemo(
    () => displayRows.filter((r) => isDraftRow(r)),
    [displayRows]
  );
  const publishedDisplayRows = useMemo(
    () => displayRows.filter((r) => !isDraftRow(r)),
    [displayRows]
  );

  function campaignPreset(row: CampaignRow): string {
    if (isDraftRow(row)) return "default";
    return presets[row.metaCampaignId] ?? row.preset ?? "default";
  }

  const exportRows = useMemo(
    () =>
      toCampaignExportRows(
        displayRows.map((r) => ({
          ...r,
          preset: campaignPreset(r),
          isDraft: isDraftRow(r)
        }))
      ),
    [displayRows, presets]
  );

  const newCampaignSlot = useMemo(
    () => (
      <>
        <IconActionButton
          icon={<FileDown size={16} />}
          label={t("exportReport")}
          onClick={() => setExportModalOpen(true)}
          disabled={!exportRows.length}
        />
        <IconActionButton
          icon={<Plus size={16} />}
          label={t("newCampaign")}
          onClick={() => setCreationPickerOpen(true)}
        />
      </>
    ),
    [t, exportRows.length]
  );

  function draftResumeHref(r: CampaignRowLike): string {
    const qs = r.clientSlug ? `?client=${encodeURIComponent(r.clientSlug)}` : "";
    return `/campaigns/new/${draftTemplateIdFromRow(r)}${qs}`;
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

  function requestDiscardDraft(row: CampaignRowLike) {
    const templateId = draftTemplateIdFromRow(row);
    if (!templateId) return;
    setDraftDiscardTarget(row);
  }

  function confirmDiscardDraft() {
    const row = draftDiscardTarget;
    if (!row) return;
    const templateId = draftTemplateIdFromRow(row);
    if (!templateId) return;

    setDraftDiscardPendingId(templateId);
    void fetch(`/api/campaign-templates/${encodeURIComponent(templateId)}`, { method: "DELETE" })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
        if (!res.ok || j.ok === false) {
          window.alert(t("discardDraftError"));
          return;
        }
        setRows((prev) =>
          prev.filter((r) => draftTemplateIdFromRow(r) !== templateId)
        );
        setTotal((prev) => Math.max(0, prev - 1));
        setDraftDiscardTarget(null);
        window.dispatchEvent(new CustomEvent("traffic:campaigns-reload"));
      })
      .finally(() => setDraftDiscardPendingId(null));
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
      setGroupPages({});
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

  // Banco por padrão; Meta ao vivo só com filtro de cliente ou após escolher período.
  const load = useCallback(
    (opts?: { live?: boolean; refresh?: boolean }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const reqId = ++requestIdRef.current;

      setLoading(true);

      const live = shouldCampaignListFetchLive({
        clientFilter,
        periodUserActivated,
        forceLive: opts?.live,
        refresh: opts?.refresh
      });
      const params = new URLSearchParams(periodStateToQuery(period));
      if (clientFilter) params.set("clientId", clientFilter);
      if (q.trim()) params.set("q", q.trim());
      if (onlyAlerts) params.set("onlyAlerts", "1");
      if (showZeroActivity) params.set("showZero", "1");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (objectiveFilter !== "ALL") params.set("objective", objectiveFilter);
      if (objectiveFilter !== "ALL" && !live) params.set("metadata", "1");
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
        params.set("limit", String(CAMPAIGN_GROUP_PAGE_SIZE));
        params.set("offset", String((page - 1) * CAMPAIGN_GROUP_PAGE_SIZE));
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
          setDataUpdatedAt(typeof j.dataUpdatedAt === "string" ? j.dataUpdatedAt : null);
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
      sortKey,
      sortDir,
      groupByType,
      periodUserActivated
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
    let cancelled = false;
    let timer: number | undefined;

    async function pollSyncStatus() {
      const qs = clientFilter ? `?clientId=${encodeURIComponent(clientFilter)}` : "";
      try {
        const res = await fetch(`/api/sync/status${qs}`);
        const j = (await res.json()) as {
          needsAutoSync?: boolean;
          activeSyncRunId?: string | null;
          lastRun?: { status?: string } | null;
        };
        if (cancelled) return;
        const running =
          !!j.activeSyncRunId ||
          j.lastRun?.status === "running" ||
          j.lastRun?.status === "queued";
        setSyncPolling(running);
        setNeedsAutoSync(!!j.needsAutoSync && !running);
        if (running) {
          timer = window.setTimeout(pollSyncStatus, 2500);
        }
      } catch {
        if (!cancelled) {
          setSyncPolling(false);
        }
      }
    }

    void pollSyncStatus();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [clientFilter]);

  async function triggerClientSync() {
    setSyncTriggering(true);
    try {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientFilter || undefined,
          auto: true
        })
      });
      if (res.ok) {
        setSyncPolling(true);
        setNeedsAutoSync(false);
        window.dispatchEvent(new Event("traffic-sync-done"));
        load({ live: true });
      }
    } finally {
      setSyncTriggering(false);
    }
  }

  useCommandStripPage(useUxChrome ? { hideFilters: true, hideSync: true } : {});

  useEffect(() => {
    setGroupPages({});
  }, [clientFilter, period.preset, period.since, period.until, statusFilter, objectiveFilter]);

  useEffect(() => {
    if (!selectedId) return;
    // Espera o detalhe (renderizado condicionalmente) entrar no DOM antes de rolar.
    const raf = requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId]);

  const pageCount = Math.max(1, Math.ceil(total / CAMPAIGN_GROUP_PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pickCampaign = (r: CampaignRow) => {
    if (isDraftRow(r)) return;
    setSelectedId(r.metaCampaignId);
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
            {isDraftRow(r) ? (
              <Link
                href={draftResumeHref(r)}
                className="ui-link block whitespace-normal break-words font-medium"
              >
                {r.campaignName}
              </Link>
            ) : useUxChrome ? (
              <Link
                href={campaignDetailHref(r)}
                onClick={() => rememberCampaign(r.metaCampaignId, r.clientSlug)}
                className="ui-link block whitespace-normal break-words font-medium"
              >
                {r.campaignName}
              </Link>
            ) : (
              <div className="whitespace-normal break-words font-medium text-[var(--text-main)]">{r.campaignName}</div>
            )}
          </td>
        );
      case "campaignId":
        return (
          <td key={col} className={`${center} text-[10px] text-[var(--text-dimmer)]`}>
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
        return <td key={col} className={`${center} text-[var(--text-dim)]`}>{r.accountLabel}</td>;
      case "spend":
        return (
          <td key={col} className={`${center} font-medium text-[var(--text-main)]`}>
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
            {isDraftRow(r) ? (
              <Badge variant="warning">{t("statusDraft")}</Badge>
            ) : (
              <Badge variant={r.status === "ACTIVE" ? "success" : "neutral"}>
                {r.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
              </Badge>
            )}
          </td>
        );
      case "alerts":
        return (
          <td key={col} className={center}>
            {r.hasAlert ? (
              <Badge variant="danger">{r.alertCount}</Badge>
            ) : (
              <span className="text-[var(--text-dimmer)]">—</span>
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
        <td key={col} className="px-4 py-3 text-left font-semibold text-[var(--text-main)]">
          {t("rowTotal")} ({total})
        </td>
      );
    }
    switch (col) {
      case "spend":
        return (
          <td key={col} className={`${center} text-[var(--text-main)]`}>
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
          <td key={col} className={`${center} text-[var(--text-dimmer)]`}>
            —
          </td>
        );
    }
  }

  const totalLabelCol = visibleColumns.includes("campaign") ? "campaign" : visibleColumns[0];

  return (
    <div className="space-y-4">
      {useUxChrome ? (
        <PageToolbar
          filterCreatorFields
          eyebrow={t("breadcrumb")}
          icon={<Megaphone size={16} />}
          title={t("title")}
          subtitle={t("subtitleList")}
          showAccountFilter={false}
          pageFilters={campaignsPageFilters}
          actions={newCampaignSlot}
        />
      ) : (
        <DsPageHeader
          breadcrumbs={t("breadcrumb")}
          title={t("title")}
          subtitle={t("subtitleList")}
          titleIcon={<Megaphone size={16} />}
          actions={
            <>
              <MetaSyncButton clientFilter={clientFilter} />
              {newCampaignSlot}
            </>
          }
        />
      )}

      {loading && shouldCampaignListFetchLive({ clientFilter, periodUserActivated }) ? (
        <DsInfoBanner loading className="px-4 py-2.5 text-sm">
          {t("loadingMetaToday")}
        </DsInfoBanner>
      ) : null}

      {enrichError ? (
        <div className="ui-alert-warning">
          <p>{enrichError}</p>
          <p className="mt-1">{t("enrichRateLimitHint")}</p>
        </div>
      ) : null}

      <CampaignMetricsDataBanner dataUpdatedAt={dataUpdatedAt} clientFilter={clientFilter} />

      {!useUxChrome ? (
      <div className="flex flex-wrap items-center gap-3 ui-card p-4">
        {!useUxChrome ? (
          <FilterSelectDropdown
            icon={<Building2 size={14} />}
            label={t("filterClient")}
            placeholder={t("allClients")}
            value={clientFilter}
            onChange={(v) => {
              setClientFilter(v);
              setSelectedId(null);
              setSelectedRow(null);
              setPage(1);
            }}
            options={clients.map((c) => ({ value: c.slug, label: c.name }))}
          />
        ) : null}
        <div className="min-w-[200px] flex-1">
          <FilterSearchInput
            size="wide"
            className="w-full"
            value={qInput}
            onChange={setQInput}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <FilterSelectDropdown
          icon={<ListFilter size={14} />}
          label={t("filterStatus")}
          placeholder={t("statusAll")}
          value={statusFilter === "ALL" ? "" : statusFilter}
          onChange={(v) => {
            setStatusFilter((v || "ALL") as StatusFilter);
            setPage(1);
          }}
          options={[
            { value: "ACTIVE", label: t("statusActive") },
            { value: "INACTIVE", label: t("statusInactive") }
          ]}
        />
        <FilterSelectDropdown
          icon={<Target size={14} />}
          label={t("filterObjective")}
          placeholder={t("objectiveAll")}
          value={objectiveFilter === "ALL" ? "" : objectiveFilter}
          onChange={(v) => {
            setObjectiveFilter((v || "ALL") as ObjectiveFilter);
            setPage(1);
          }}
          options={[
            { value: "leads", label: t("objectiveLeads") },
            { value: "sales", label: t("objectiveSales") },
            { value: "traffic", label: t("objectiveTraffic") }
          ]}
        />
        {!useUxChrome ? (
          <PeriodFilter
            value={period}
            onChange={(next) => {
              setPeriod(next);
              setPage(1);
            }}
          />
        ) : null}
        <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-dim)]">
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
        <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-dim)]">
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
      ) : null}

      {clientFilter ? (
        <DsInfoBanner className="px-4 py-2.5 text-xs">
          {t("clientScopeHint", { client: clientLabel })}
        </DsInfoBanner>
      ) : null}

      {groupByType ? (
        <div className={`space-y-4 ${loading && rows.length > 0 ? "opacity-60 pointer-events-none" : ""}`}>
          {loading && rows.length === 0 ? (
            <TableSkeleton
              rows={6}
              columns={["wide", "text", "badge", "select", "metric", "metric", "metric"]}
            />
          ) : rows.length === 0 && draftDisplayRows.length === 0 ? (
            <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</div>
          ) : publishedDisplayRows.length === 0 && draftDisplayRows.length === 0 ? (
            <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("emptyFiltered")}</div>
          ) : (
            <>
              {draftDisplayRows.length > 0 ? (
                <div className="ui-campaign-table-shell ui-campaign-table-shell--compact">
                  <div className="ui-campaign-table-shell__header">
                    <div className="ui-campaign-table-shell__title">
                      <span className="ui-campaign-table-shell__icon">
                        <FilePenLine size={15} strokeWidth={2} />
                      </span>
                      <span className="truncate">
                        {t("draftsSectionTitle")}{" "}
                        <span className="font-normal text-[var(--text-dimmer)]">({draftDisplayRows.length})</span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs font-body text-[var(--text-dim)] sm:inline">
                        {t("draftsSectionHint")}
                      </span>
                    </div>
                  </div>
                  <CampaignDraftMobileCards
                    rows={draftDisplayRows}
                    resumeHref={draftResumeHref}
                    onDiscard={requestDiscardDraft}
                    discardPendingId={draftDiscardPendingId}
                    statusDraftLabel={t("statusDraft")}
                    resumeLabel={t("resumeDraft")}
                    discardLabel={t("discardDraft")}
                  />
                  <div className="hidden overflow-x-auto md:block">
                    <table className="ui-campaign-table ui-campaign-table--compact min-w-[640px]">
                      <thead>
                        <tr>
                          <th className={`whitespace-nowrap ${STICKY_STATUS_TH_COMPACT}`}>{t("filterStatus")}</th>
                          <th className={`whitespace-nowrap ${STICKY_NAME_TH_COMPACT}`}>{t("colCampaign")}</th>
                          <th className="whitespace-nowrap text-center">{t("colClient")}</th>
                          <th className="whitespace-nowrap text-center">{t("resumeDraft")}</th>
                          <th className="whitespace-nowrap text-center">{t("discardDraft")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftDisplayRows.map((r) => {
                          const templateId = draftTemplateIdFromRow(r);
                          const discarding = draftDiscardPendingId === templateId;
                          return (
                            <tr key={r.metaCampaignId} className="group">
                              <td className={STICKY_STATUS_TD_COMPACT}>
                                <span className="ds-table-compact-badge ds-table-compact-badge--accent">
                                  {t("statusDraft")}
                                </span>
                              </td>
                              <td className={STICKY_NAME_TD_COMPACT}>
                                <Link
                                  href={draftResumeHref(r)}
                                  className="ui-campaign-table-name block whitespace-normal break-words text-left"
                                >
                                  {r.campaignName}
                                </Link>
                              </td>
                              <td className="ui-campaign-table-client truncate text-center">
                                {r.clientName}
                              </td>
                              <td className="text-center">
                                <Link href={draftResumeHref(r)} className="ds-table-compact-action">
                                  {t("resumeDraft")}
                                </Link>
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  disabled={discarding}
                                  onClick={() => requestDiscardDraft(r)}
                                  className="ds-table-compact-action ds-table-compact-action--danger"
                                  title={t("discardDraft")}
                                >
                                  <Trash2 size={12} />
                                  {t("discardDraft")}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {groupKeys.map((preset) => {
              const list = publishedDisplayRows.filter((r) => campaignPreset(r) === preset);
              if (!list.length) return null;
              const groupMetricColumns = metricsColumnsForPreset(preset, customTypesMap);
              const groupSort = groupSorts[preset];
              const sorted = sortGroupRows(list, preset, groupMetricColumns);
              const groupPage = groupPages[preset] ?? 1;
              const groupPageCount = Math.max(1, Math.ceil(sorted.length / CAMPAIGN_GROUP_PAGE_SIZE));
              const safeGroupPage = Math.min(groupPage, groupPageCount);
              const pagedRows = sorted.slice(
                (safeGroupPage - 1) * CAMPAIGN_GROUP_PAGE_SIZE,
                safeGroupPage * CAMPAIGN_GROUP_PAGE_SIZE
              );
              const groupTotals = computeGroupTotals(
                sorted,
                groupMetricColumns,
                tableLayout.customMetricsMap
              );
              const presetIcon = getCampaignPresetIconConfig(preset);
              const PresetIcon = presetIcon.Icon;
              return (
                <div key={preset} className="ui-campaign-table-shell ui-campaign-table-shell--compact">
                  <div className="ui-campaign-table-shell__header">
                    <div className="ui-campaign-table-shell__title">
                      <span className="ui-campaign-table-shell__icon">
                        <PresetIcon size={15} strokeWidth={2} />
                      </span>
                      <span className="truncate">
                        {groupLabel(preset)}{" "}
                        <span className="font-normal text-[var(--text-dimmer)]">({list.length})</span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CampaignGroupPager
                        page={safeGroupPage}
                        pageCount={groupPageCount}
                        onPageChange={(next) =>
                          setGroupPages((prev) => ({ ...prev, [preset]: next }))
                        }
                      />
                    </div>
                  </div>
                  <CampaignMobileCards
                    rows={pagedRows}
                    detailHref={campaignDetailHref}
                    formatMoney={(n) => formatBRL(n, locale)}
                    formatRoas={(n) => formatRoas(n, locale)}
                    formatCpl={(n) => (n == null ? "—" : formatBRL(n, locale))}
                    statusLabel={statusLabel}
                    statusPendingId={statusPendingId}
                    onToggleStatus={toggleCampaignStatus}
                    onRemember={rememberCampaign}
                  />
                  <div className="hidden overflow-x-auto md:block">
                    <table className="ui-campaign-table ui-campaign-table--compact">
                      <thead>
                        <tr>
                          <th className={`whitespace-nowrap ${STICKY_STATUS_TH_COMPACT}`}>
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "status")}
                              className="hover:text-[var(--text-main)]"
                            >
                              {t("colStatus")}
                              {groupSort?.key === "status"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className={`whitespace-nowrap ${STICKY_NAME_TH_COMPACT}`}>
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "name")}
                              className="hover:text-[var(--text-main)]"
                            >
                              {t("colCampaign")}
                              {groupSort?.key === "name"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className="whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => toggleGroupSort(preset, "client")}
                              className="hover:text-[var(--text-main)]"
                            >
                              {t("colClient")}
                              {groupSort?.key === "client"
                                ? groupSort.dir === "asc"
                                  ? " ▲"
                                  : " ▼"
                                : ""}
                            </button>
                          </th>
                          <th className="whitespace-nowrap text-center">
                            {tPresets("label")}
                          </th>
                          <CampaignTableHead
                            columns={groupMetricColumns}
                            customMetricNames={customMetricNames}
                            sortKey={groupSort?.key}
                            sortDir={groupSort?.dir}
                            onSort={(key) => toggleGroupSort(preset, key)}
                            compact
                          />
                          <th className="ui-campaign-table-chevron" aria-hidden />
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((r) => (
                          <tr
                            key={r.metaCampaignId}
                            className="group"
                          >
                            <td className={STICKY_STATUS_TD_COMPACT}>
                              <CampaignStatusToggle
                                active={r.status === "ACTIVE"}
                                disabled={statusPendingId === r.metaCampaignId}
                                ariaLabel={statusLabel(r.status)}
                                onChange={() => toggleCampaignStatus(r.metaCampaignId, r.status)}
                              />
                            </td>
                            <td className={STICKY_NAME_TD_COMPACT}>
                              {useUxChrome ? (
                                <Link
                                  href={campaignDetailHref(r)}
                                  onClick={() => rememberCampaign(r.metaCampaignId, r.clientSlug)}
                                  className="ui-campaign-table-name block w-full whitespace-normal break-words text-left"
                                >
                                  {r.campaignName}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => pickCampaign(r)}
                                  className="ui-campaign-table-name block w-full whitespace-normal break-words text-left"
                                >
                                  {r.campaignName}
                                </button>
                              )}
                            </td>
                            <td className="ui-campaign-table-client truncate text-center">{r.clientName}</td>
                            <td className="relative text-center">
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
                                compact
                              />
                            ))}
                            <td className="ui-campaign-table-chevron">
                              <ChevronRight size={14} strokeWidth={2} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className={`${STICKY_STATUS_TF_COMPACT} ui-campaign-table-footer-empty`} />
                          <td className={STICKY_NAME_TF_COMPACT}>
                            {t("rowTotal")} ({list.length})
                          </td>
                          <td className="ui-campaign-table-footer-empty text-center" />
                          <td className="ui-campaign-table-footer-empty text-center" />
                          {groupMetricColumns.map((col) => {
                            const key = columnRefKey(col);
                            const val = groupTotals[key];
                            let content = "";
                            let toneClass = "font-semibold tabular-nums text-[var(--text-main)]";
                            if (val != null && col.kind === "metric") {
                              content = formatMetricValue(col.key, val, locale);
                              if (col.key === "spend") toneClass = "ui-campaign-table-spend font-bold";
                              else if (col.key === "ctr")
                                toneClass = `${campaignMetricToneClass(campaignMetricTone(content))} font-bold`;
                            } else if (val != null && col.kind === "custom") {
                              const fmt = tableLayout.customMetricsMap[col.id]?.format ?? "number";
                              if (fmt === "currency") {
                                content = formatBRL(val, locale);
                                toneClass = "ui-campaign-table-spend font-bold";
                              } else if (fmt === "percent") {
                                content = formatPercent(val, 2, locale);
                                toneClass = `${campaignMetricToneClass(campaignMetricTone(content))} font-bold`;
                              } else if (fmt === "multiplier") content = formatRoas(val, locale);
                              else content = String(Math.round(val * 100) / 100);
                            } else if (val != null) {
                              content = String(val);
                            }
                            return (
                              <td key={key} className={`text-center ${toneClass}`}>
                                {content}
                              </td>
                            );
                          })}
                          <td className="ui-campaign-table-chevron" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      ) : (
      <div className="ui-card overflow-hidden">
        <CampaignDraftMobileCards
          rows={draftDisplayRows}
          resumeHref={draftResumeHref}
          onDiscard={requestDiscardDraft}
          discardPendingId={draftDiscardPendingId}
          statusDraftLabel={t("statusDraft")}
          resumeLabel={t("resumeDraft")}
          discardLabel={t("discardDraft")}
        />
        <CampaignMobileCards
          rows={publishedDisplayRows}
          detailHref={campaignDetailHref}
          formatMoney={(n) => formatBRL(n, locale)}
          formatRoas={(n) => formatRoas(n, locale)}
          formatCpl={(n) => (n == null ? "—" : formatBRL(n, locale))}
          statusLabel={statusLabel}
          statusPendingId={statusPendingId}
          onToggleStatus={toggleCampaignStatus}
          onRemember={rememberCampaign}
        />
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
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
                  <tr key={i} className="even:bg-[var(--surface-row-alt)] border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]">
                    {visibleColumns.map((col) => (
                      <td key={col} className="px-3 py-3 first:pl-4">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-[var(--text-dim)]">
                    {t("emptyFiltered")}
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
                  <tr
                    key={r.metaCampaignId}
                    className={`even:bg-[var(--surface-row-alt)] border-t border-[var(--border-color)] hover:bg-[var(--row-hover)] ${
                      !useUxChrome && !isDraftRow(r) ? "cursor-pointer" : ""
                    } ${!useUxChrome && !isDraftRow(r) && selectedId === r.metaCampaignId ? "bg-[rgba(245,166,35,0.08)]" : ""}`}
                    onClick={() => !useUxChrome && !isDraftRow(r) && pickCampaign(r)}
                  >
                    {visibleColumns.map((col) => renderCell(col, r))}
                  </tr>
                ))
              )}
            </tbody>
            {loading ? (
              <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--surface-thead)]/80">
                <tr>
                  {visibleColumns.map((col) => (
                    <td key={col} className="px-3 py-3 first:pl-4">
                      <Skeleton className="h-4 w-full max-w-[80px]" />
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : rows.length > 0 ? (
              <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--surface-thead)]/80">
                <tr>
                  {visibleColumns.map((col) => renderTotalCell(col, totalLabelCol))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--surface-thead)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--text-main)]">
            {t("pagination", {
              from: total ? (page - 1) * CAMPAIGN_GROUP_PAGE_SIZE + 1 : 0,
              to: Math.min(page * CAMPAIGN_GROUP_PAGE_SIZE, total),
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
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-1.5 text-sm font-semibold text-[var(--text-main)] shadow-sm">
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

      {selectedId && !useUxChrome ? (
        <div ref={detailRef} className="space-y-2 scroll-mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("detailTitle")}</h2>
            <Link
              href={campaignDetailHref({ metaCampaignId: selectedId, clientSlug: selectedSlug })}
              className="ui-link text-xs"
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
      ) : total > 0 && !useUxChrome ? (
        <p className="text-center text-sm text-[var(--text-dim)]">{t("pickRowHint")}</p>
      ) : total > 0 && useUxChrome ? null : (
        <div className="ui-card space-y-4 p-8 text-center">
          <p className="text-lg font-semibold text-[var(--text-main)]">
            {syncPolling || syncTriggering ? tSync("syncingCampaigns") : t("emptyTitle")}
          </p>
          <p className="mx-auto max-w-lg text-sm text-[var(--text-dim)]">
            {syncPolling || syncTriggering
              ? t("emptySyncingExplain")
              : needsAutoSync
                ? t("emptyNeedsSyncExplain")
                : t("emptyExplain")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!syncPolling && !syncTriggering ? (
              <button type="button" onClick={() => openPanel()} className="ui-btn-accent">
                {t("createFirst")}
              </button>
            ) : null}
            {syncPolling || syncTriggering ? (
              <p className="text-sm text-[var(--text-dim)]">{tSync("syncing")}</p>
            ) : (
              <button
                type="button"
                disabled={syncTriggering}
                onClick={() => void triggerClientSync()}
                className="ui-btn-accent-outline"
              >
                {needsAutoSync ? t("syncNowHighlight") : t("syncNow")}
              </button>
            )}
          </div>
        </div>
      )}
      <CampaignCreationModePicker
        open={creationPickerOpen}
        onClose={() => setCreationPickerOpen(false)}
        clientSlug={clientFilter || undefined}
      />
      <CampaignExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        rows={exportRows}
        groupLabel={t("exportReportTitle")}
        customMetrics={tableLayout.customMetricsMap}
        clientLabel={clientFilter ? clientLabel : undefined}
        clientSlug={clientFilter || undefined}
        period={period}
        periodReadOnly={useUxChrome}
        onPeriodChange={useUxChrome ? undefined : setPeriod}
        customTypeNames={customTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
      />
      <ConfirmDialog
        open={draftDiscardTarget != null}
        title={t("discardDraftConfirmTitle")}
        description={
          draftDiscardTarget ? (
            <>
              <span className="block font-medium text-[var(--text-main)]">
                {draftDiscardTarget.campaignName}
              </span>
              <span className="mt-2 block">{t("discardDraftConfirm")}</span>
            </>
          ) : (
            t("discardDraftConfirm")
          )
        }
        confirmLabel={t("discardDraft")}
        cancelLabel={tCommon("cancel")}
        variant="danger"
        loading={
          draftDiscardTarget != null &&
          draftDiscardPendingId === draftTemplateIdFromRow(draftDiscardTarget)
        }
        onConfirm={confirmDiscardDraft}
        onCancel={() => setDraftDiscardTarget(null)}
      />
    </div>
  );
}
