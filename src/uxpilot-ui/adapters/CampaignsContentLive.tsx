"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  type AppliedCampaignFilter,
  matchesCampaignFilters
} from "@/lib/campaign-meta-filters";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { Link } from "@/i18n/navigation";
import type { MetricKey } from "@/lib/dashboard-metrics";
import CampaignsContent, { type CampaignsLiveProps } from "@/uxpilot-ui/pages/content/Campaigns";
import { toUxCampaignRows } from "@/uxpilot-ui/adapters/campaigns-mappers";
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
import { useCampaignsData } from "@/uxpilot-ui/adapters/useCampaignsData";

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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [displayStatusFilter, setDisplayStatusFilter] = useState<DisplayStatusFilter>("all");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [q, objectiveFilter, categoryFilter, displayStatusFilter, metaFilters]);

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
    pageSize,
    page
  });

  useCommandStripPage({
    trailingSlot: (
      <Link
        href="/campaigns/new"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold shadow-lg transition-all hover:brightness-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #f5a623, #e8920d)",
          color: "#0f1419",
          fontFamily: "var(--font-heading)"
        }}
      >
        <Plus size={15} />
        {t("newCampaign")}
      </Link>
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

  const filteredRows = useMemo(
    () => data.rows.filter((row) => matchesCampaignFilters(row, metaFilters)),
    [data.rows, metaFilters]
  );

  const categoryKeys = useMemo(() => buildCategoryKeys(customTypes), [customTypes]);

  const categoryOptions = useMemo(
    () =>
      categoryKeys
        .map((key) => ({
          value: key,
          label: categoryLabelFor(key, customTypes, (k) => tPresets(k as "default")),
          count: filteredRows.filter((r) => resolveCampaignPreset(r, presets) === key).length
        }))
        .filter((o) => o.count > 0),
    [categoryKeys, customTypes, filteredRows, presets, tPresets]
  );

  useEffect(() => {
    if (categoryFilter && categoryOptions.some((o) => o.value === categoryFilter)) return;
    if (categoryOptions[0]) setCategoryFilter(categoryOptions[0].value);
  }, [categoryFilter, categoryOptions]);

  const categoryRows = useMemo(() => {
    if (!categoryFilter) return filteredRows;
    return filteredRows.filter((r) => resolveCampaignPreset(r, presets) === categoryFilter);
  }, [filteredRows, presets, categoryFilter]);

  const campaigns = useMemo(
    () => toUxCampaignRows(categoryRows, data.locale, presets),
    [categoryRows, data.locale, presets]
  );

  const { kpis, count: categoryCount } = useMemo(
    () =>
      categoryFilter
        ? toCategoryKpis(
            filteredRows,
            presets,
            categoryFilter,
            customTypes,
            tableLayout.customMetricsMap,
            data.locale,
            (key) => tMetrics(key as MetricKey)
          )
        : { kpis: [], count: 0 },
    [
      filteredRows,
      presets,
      categoryFilter,
      customTypes,
      tableLayout.customMetricsMap,
      data.locale,
      tMetrics
    ]
  );

  const categoryLabel = categoryFilter
    ? categoryLabelFor(categoryFilter, customTypes, (k) => tPresets(k as "default"))
    : "";

  const changePreset = useCallback((metaCampaignId: string, preset: string) => {
    setPresets((prev) => ({ ...prev, [metaCampaignId]: preset }));
    void fetch("/api/campaign-presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metaCampaignId, preset })
    });
  }, []);

  const live: CampaignsLiveProps = {
    campaigns,
    kpis,
    categoryFilter,
    onCategoryFilterChange: setCategoryFilter,
    categoryOptions: categoryOptions.map(({ value, label }) => ({ value, label })),
    categoryLabel,
    categoryCount,
    page,
    pageSize,
    totalCount: data.total,
    onPageChange: setPage,
    displayStatusFilter,
    onDisplayStatusFilterChange: setDisplayStatusFilter,
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
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categoryOptions={categoryOptions.map(({ value, label }) => ({ value, label }))}
      />
    )
  };

  return <CampaignsContent live={live} />;
}
