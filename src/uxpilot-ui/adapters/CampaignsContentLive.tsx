"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { rememberCampaign } from "@/components/CampaignsListClient";
import {
  CampaignManagerClient,
  type CampaignSeedRow
} from "@/components/CampaignManagerClient";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import {
  type AppliedCampaignFilter,
  matchesCampaignFilters
} from "@/lib/campaign-meta-filters";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { type PeriodState, periodStateToQuery } from "@/components/PeriodFilter";
import { IconLabelLink } from "@/components/ui/IconLabelButton";
import { Link } from "@/i18n/navigation";
import type { MetricKey } from "@/lib/dashboard-metrics";
import CampaignsContent, { type CampaignsLiveProps } from "@/uxpilot-ui/pages/content/Campaigns";
import {
  computeUxTableTotals,
  toUxCampaignRows,
  type UxCampaignGroup
} from "@/uxpilot-ui/adapters/campaigns-mappers";
import {
  buildCategoryKeys,
  categoryLabelFor,
  resolveCampaignPreset,
  toCategoryKpis
} from "@/uxpilot-ui/adapters/campaign-category-kpis";
import {
  type DisplayStatusFilter,
  type ObjectiveFilter,
  UxCampaignFiltersPanel
} from "@/uxpilot-ui/adapters/UxCampaignFiltersPanel";
import {
  type CampaignRow,
  useCampaignsData
} from "@/uxpilot-ui/adapters/useCampaignsData";

const EMPTY_PERIOD: PeriodState = { preset: "last7", since: "", until: "" };

function toSeedRow(row: CampaignRow): CampaignSeedRow {
  return {
    metaCampaignId: row.metaCampaignId,
    campaignName: row.campaignName,
    clientName: row.clientName,
    clientSlug: row.clientSlug,
    accountLabel: row.accountLabel,
    metaAdAccountId: row.metaAdAccountId,
    status: row.status,
    objective: row.objective,
    spend: row.spend,
    conversions: row.conversions,
    leads: row.leads,
    roas: row.roas,
    cpa: row.cpa
  };
}

function matchesDisplayStatus(row: CampaignRow, filter: DisplayStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return row.metaCampaignId.startsWith("draft:");
  if (filter === "active") return row.status === "ACTIVE";
  if (filter === "paused") return row.status === "PAUSED";
  return true;
}

export function CampaignsContentLive() {
  const t = useTranslations("campaignsPage");
  const tPresets = useTranslations("campaignTypes");
  const tMetrics = useTranslations("metrics");
  const { types: customTypes } = useCampaignTypes();
  const tableLayout = useCampaignTableLayout();
  const [metaFilters, setMetaFilters] = useState<AppliedCampaignFilter[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showTotals, setShowTotals] = useState(true);
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [displayStatusFilter, setDisplayStatusFilter] = useState<DisplayStatusFilter>("all");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedRow, setSelectedRow] = useState<CampaignRow | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const strip = useCommandStripOptional();
  const period = strip?.period ?? EMPTY_PERIOD;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(filterSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filterSearch]);

  const data = useCampaignsData({
    q,
    statusFilter: "ALL",
    objectiveFilter,
    onlyAlerts: false,
    showZeroActivity: false,
    pageSize: 500,
    page: 1,
    groupByType: true
  });

  useCommandStripPage({
    trailingSlot: (
      <IconLabelLink
        href="/campaigns/new"
        label={t("newCampaign")}
        icon={<Plus size={15} />}
        className="ui-btn-accent font-heading hover:brightness-110 active:scale-95"
      />
    )
  });

  useEffect(() => {
    fetch("/api/campaign-presets")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPresets((prev) => ({ ...prev, ...(j.presets ?? {}) }));
      })
      .catch(() => {});
  }, []);

  const filteredRows = useMemo(() => {
    return data.rows
      .filter((row) => matchesCampaignFilters(row, metaFilters))
      .filter((row) => matchesDisplayStatus(row, displayStatusFilter));
  }, [data.rows, metaFilters, displayStatusFilter]);

  const categoryKeys = useMemo(() => buildCategoryKeys(customTypes), [customTypes]);

  const campaignGroups = useMemo((): UxCampaignGroup[] => {
    const groups: UxCampaignGroup[] = [];
    for (const key of categoryKeys) {
      const rows = filteredRows.filter((r) => resolveCampaignPreset(r, presets) === key);
      if (!rows.length) continue;
      const campaigns = toUxCampaignRows(rows, data.locale, presets);
      const { kpis } = toCategoryKpis(
        rows,
        presets,
        key,
        customTypes,
        tableLayout.customMetricsMap,
        data.locale,
        (metricKey) => tMetrics(metricKey as MetricKey)
      );
      groups.push({
        key,
        label: categoryLabelFor(key, customTypes, (k) => tPresets(k as "default")),
        count: campaigns.length,
        campaigns,
        kpis,
        totals: computeUxTableTotals(rows, data.locale)
      });
    }
    return groups;
  }, [
    categoryKeys,
    filteredRows,
    presets,
    data.locale,
    customTypes,
    tableLayout.customMetricsMap,
    tMetrics,
    tPresets
  ]);

  const totalCampaigns = useMemo(
    () => campaignGroups.reduce((sum, g) => sum + g.campaigns.length, 0),
    [campaignGroups]
  );

  const changePreset = useCallback((metaCampaignId: string, preset: string) => {
    setPresets((prev) => ({ ...prev, [metaCampaignId]: preset }));
    void fetch("/api/campaign-presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metaCampaignId, preset })
    });
  }, []);

  const pickCampaign = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedId(null);
        setSelectedSlug("");
        setSelectedRow(null);
        return;
      }
      const row = filteredRows.find((r) => r.metaCampaignId === id);
      if (!row || row.metaCampaignId.startsWith("draft:")) return;
      setSelectedId(id);
      setSelectedSlug(row.clientSlug);
      setSelectedRow(row);
      rememberCampaign(id, row.clientSlug);
    },
    [filteredRows]
  );

  useEffect(() => {
    if (!selectedId) return;
    const raf = requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !filteredRows.some((r) => r.metaCampaignId === selectedId)) {
      setSelectedId(null);
      setSelectedSlug("");
      setSelectedRow(null);
    }
  }, [filteredRows, selectedId]);

  const periodQuery = useMemo(() => {
    const qs = periodStateToQuery(period).toString();
    return qs ? `?${qs}` : "";
  }, [period]);

  const detailPanel =
    selectedId && selectedRow ? (
      <div ref={detailRef} className="scroll-mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className="font-heading text-sm font-semibold"
            style={{ color: "var(--text-main)" }}
          >
            {t("detailTitle")}
          </h2>
          <Link
            href={`/campaigns/${selectedId}?client=${encodeURIComponent(selectedSlug)}`}
            className="text-xs font-medium"
            style={{ color: "var(--ui-accent)" }}
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
          seedRow={toSeedRow(selectedRow)}
          periodQuery={periodQuery}
        />
      </div>
    ) : totalCampaigns > 0 && !data.loading ? (
      <p className="text-center text-sm" style={{ color: "var(--text-dim)" }}>
        {t("pickRowHint")}
      </p>
    ) : null;

  const live: CampaignsLiveProps = {
    campaignGroups,
    totalCampaigns,
    loading: data.loading,
    statusPendingId: data.statusPendingId,
    onToggleStatus: (id, rawStatus) => data.toggleStatus(String(id), rawStatus),
    onPresetChange: changePreset,
    customTypes,
    filterSearch,
    onFilterSearchChange: setFilterSearch,
    metaFilters,
    onMetaFiltersChange: setMetaFilters,
    showFilters,
    onShowFiltersChange: setShowFilters,
    showTotals,
    onShowTotalsChange: setShowTotals,
    objectiveFilter,
    onObjectiveFilterChange: setObjectiveFilter,
    displayStatusFilter,
    onDisplayStatusFilterChange: setDisplayStatusFilter,
    selectedCampaignId: selectedId,
    onSelectCampaign: pickCampaign,
    detailPanel,
    filtersPanel: (
      <UxCampaignFiltersPanel
        filterSearch={filterSearch}
        onFilterSearchChange={setFilterSearch}
        metaFilters={metaFilters}
        onMetaFiltersChange={setMetaFilters}
        displayStatusFilter={displayStatusFilter}
        onDisplayStatusFilterChange={setDisplayStatusFilter}
        objectiveFilter={objectiveFilter}
        onObjectiveFilterChange={setObjectiveFilter}
      />
    )
  };

  return <CampaignsContent live={live} />;
}
