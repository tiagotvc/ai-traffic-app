"use client";

import {
  AlertCircle,
  BarChart2,
  FileSpreadsheet,
  FileText,
  Filter,
  LineChart,
  SlidersHorizontal
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChoiceCardCheck,
  MultiSelectChoiceCard
} from "@/components/campaign-creator/BudgetChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { CampaignExportPreview } from "@/components/campaign/CampaignExportPreview";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PeriodFilter, type PeriodState } from "@/components/PeriodFilter";
import { cn } from "@/lib/cn";
import { METRIC_CATALOG, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { exportCampaignReport } from "@/lib/export-campaigns-report";
import {
  DEFAULT_EXPORT_ACCENT,
  hasWhiteLabelBranding,
  resolveExportAccentColor,
  type CampaignExportBranding
} from "@/lib/export/campaign-export-branding";
import { buildCampaignExportPreviewModel } from "@/lib/export/campaign-export-preview-data";
import {
  DEFAULT_EXPORT_CHARTS,
  DEFAULT_EXPORT_FILTERS,
  DEFAULT_EXPORT_METRICS,
  EXPORT_SCOPE_TOP_N,
  type CampaignExportChartKey,
  type CampaignExportConfig,
  type CampaignExportFilters,
  type CampaignExportFormat,
  type CampaignExportScope,
  type CampaignExportStatusFilter
} from "@/lib/export/campaign-export-types";
import {
  campaignRowId,
  resolveExportRows,
  uniqueExportClients,
  uniqueExportPresets,
  EXPORT_DRAFT_CATEGORY
} from "@/lib/export/campaign-export-scope";
import type { CampaignPdfRow } from "@/lib/export/campaign-table-pdf";
import { preparePdfExportColumns } from "@/lib/export-campaigns-pdf";
import { formatPeriodLabel, periodStateToParsed } from "@/lib/report-period";

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

type CustomTypeName = {
  id: string;
  name: string;
};

type TenantBranding = {
  brandName?: string;
  logoUrl?: string;
  name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  rows: CampaignPdfRow[];
  groupLabel: string;
  customMetrics: Record<string, CustomMetricDef>;
  clientLabel?: string;
  clientSlug?: string;
  brandName?: string;
  period: PeriodState;
  periodReadOnly?: boolean;
  onPeriodChange?: (next: PeriodState) => void;
  customTypeNames?: CustomTypeName[];
};

function FormatChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: typeof FileText;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row h-full min-h-[7.5rem]",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
          {label}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

function resolveMetricColumnLabels(
  metrics: MetricKey[],
  tMetrics: ReturnType<typeof useTranslations<"metrics">>
): string[] {
  return metrics.map((key) => tMetrics(METRIC_BY_KEY[key].label));
}

function ExportErrorToast({ message }: { message: string }) {
  return (
    <div className="campaign-creator-status-toast" role="alert" aria-live="assertive">
      <div className="campaign-creator-status-toast__inner campaign-creator-status-toast__inner--solid ui-alert-danger flex items-start gap-2 px-4 py-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left text-sm leading-snug">{message}</span>
      </div>
    </div>
  );
}

export function CampaignExportModal({
  open,
  onClose,
  rows,
  groupLabel,
  customMetrics,
  clientLabel,
  clientSlug,
  brandName = "Orion Agency",
  period,
  periodReadOnly = true,
  onPeriodChange,
  customTypeNames = []
}: Props) {
  const t = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const tPeriod = useTranslations("period");
  const tPresets = useTranslations("campaignPresets");
  const locale = useLocale();

  const [format, setFormat] = useState<CampaignExportFormat>("pdf");
  const [scope, setScope] = useState<CampaignExportScope>("all");
  const [filters, setFilters] = useState<CampaignExportFilters>(DEFAULT_EXPORT_FILTERS);
  const [metrics, setMetrics] = useState<MetricKey[]>(DEFAULT_EXPORT_METRICS);
  const [charts, setCharts] = useState<CampaignExportChartKey[]>(DEFAULT_EXPORT_CHARTS);
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorTimerRef = useRef<number | null>(null);

  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  const [reportTitle, setReportTitle] = useState(groupLabel);
  const [agencyName, setAgencyName] = useState(brandName);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [accentColor, setAccentColor] = useState(DEFAULT_EXPORT_ACCENT);
  const [footerContact, setFooterContact] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormat("pdf");
    setScope("all");
    setFilters(DEFAULT_EXPORT_FILTERS);
    setMetrics(DEFAULT_EXPORT_METRICS);
    setCharts(DEFAULT_EXPORT_CHARTS);
    setCustomIds([]);
    setErrorMessage(null);
    setReportTitle(groupLabel);
    setAgencyName(brandName);
    setIncludeLogo(true);
    setAccentColor(DEFAULT_EXPORT_ACCENT);
    setFooterContact("");

    void fetch("/api/settings/tenant")
      .then((r) => r.json())
      .then((json) => {
        if (!json?.tenant) return;
        const tenant = json.tenant as TenantBranding;
        setTenantBranding(tenant);
        const resolvedBrand = tenant.brandName ?? tenant.name ?? brandName;
        setAgencyName(resolvedBrand);
        if (tenant.logoUrl) setIncludeLogo(true);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [open, groupLabel, brandName]);

  useEffect(() => {
    if (!errorMessage) return;
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => setErrorMessage(null), 6000);
    return () => {
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    };
  }, [errorMessage]);

  const periodLabel = useMemo(() => {
    const parsed = periodStateToParsed(period);
    return formatPeriodLabel(parsed, locale, {
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
    });
  }, [period, locale, tPeriod]);

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: t("exportScopeAll") },
      { value: "top_performers", label: t("exportScopeTopPerformers", { count: EXPORT_SCOPE_TOP_N }) },
      { value: "best_roas", label: t("exportScopeBestRoas", { count: EXPORT_SCOPE_TOP_N }) },
      { value: "best_spend", label: t("exportScopeBestSpend", { count: EXPORT_SCOPE_TOP_N }) },
      { value: "active_only", label: t("exportScopeActive") },
      { value: "paused_only", label: t("exportScopePaused") },
      { value: "custom", label: t("exportScopeCustom") }
    ],
    [t]
  );

  const chartOptions: Array<{ key: CampaignExportChartKey; label: string; icon: typeof BarChart2 }> = [
    { key: "spend_bar", label: t("exportChartSpendBar"), icon: BarChart2 },
    { key: "roas_line", label: t("exportChartRoasLine"), icon: LineChart }
  ];

  const exportConfig = useMemo<CampaignExportConfig>(
    () => ({
      format,
      scope,
      customCampaignIds: customIds,
      metrics,
      charts: format === "pdf" || format === "xlsx" ? charts : [],
      topN: EXPORT_SCOPE_TOP_N,
      filters
    }),
    [format, scope, customIds, metrics, charts, filters]
  );

  const availableClients = useMemo(() => uniqueExportClients(rows), [rows]);
  const availablePresets = useMemo(() => uniqueExportPresets(rows), [rows]);

  const resolvePresetLabel = useMemo(
    () => (key: string) => {
      if (key === EXPORT_DRAFT_CATEGORY) return t("exportSheetDraft");
      if (key.startsWith("custom:")) {
        const id = key.slice("custom:".length);
        return customTypeNames.find((ct) => ct.id === id)?.name ?? id;
      }
      return tPresets(key as "default");
    },
    [t, tPresets, customTypeNames]
  );

  const sheetLabels = useMemo(
    () => ({
      all: t("exportSheetAll"),
      draft: t("exportSheetDraft"),
      charts: t("exportSheetCharts"),
      chartData: t("exportSheetChartData"),
      resolvePreset: resolvePresetLabel
    }),
    [t, resolvePresetLabel]
  );

  const metricColumnLabels = useMemo(
    () => resolveMetricColumnLabels(metrics, tMetrics),
    [metrics, tMetrics]
  );

  const pdfColumns = useMemo(
    () =>
      preparePdfExportColumns({
        metricColumns: metrics.map((key) => ({ kind: "metric" as const, key })),
        metricColumnLabels,
        forcePortrait: metrics.length === 0
      }),
    [metrics, metricColumnLabels]
  );

  const branding = useMemo<CampaignExportBranding>(
    () => ({
      brandName: tenantBranding?.brandName ?? brandName,
      agencyName: agencyName.trim() || brandName,
      logoUrl: tenantBranding?.logoUrl ?? undefined,
      accentColor: resolveExportAccentColor(accentColor),
      reportTitle: reportTitle.trim() || groupLabel,
      includeLogo: includeLogo && Boolean(tenantBranding?.logoUrl),
      footerContact: footerContact.trim() || undefined
    }),
    [
      tenantBranding,
      brandName,
      agencyName,
      accentColor,
      reportTitle,
      groupLabel,
      includeLogo,
      footerContact
    ]
  );

  const whiteLabelReady = hasWhiteLabelBranding({
    brandName: tenantBranding?.brandName ?? brandName,
    logoUrl: tenantBranding?.logoUrl ?? undefined,
    agencyName
  });

  const labels = useMemo(
    () => ({
      campaign: t("colCampaign"),
      client: t("colClient"),
      status: t("colStatus"),
      type: t("colType"),
      total: t("rowTotal"),
      pageOf: (page: number, total: number) => t("exportPageOf", { page, total }),
      statusActive: t("statusActive"),
      statusPaused: t("statusPaused"),
      statusInactive: t("statusInactive"),
      statusDraft: t("statusDraft"),
      campaignsCount: (n: number) => t("exportCampaignsCount", { count: n }),
      clientScope: (client: string) => t("exportClientScope", { client }),
      allClients: t("allClients"),
      periodLabel,
      chartsSectionTitle: t("exportChartsSection")
    }),
    [t, periodLabel]
  );

  const previewRows = useMemo(
    () => resolveExportRows(rows, exportConfig),
    [rows, exportConfig]
  );

  const previewModel = useMemo(() => {
    if (!previewRows.length) return null;
    return buildCampaignExportPreviewModel({
      format,
      reportTitle: branding.reportTitle ?? groupLabel,
      rows: previewRows,
      metricColumns: pdfColumns.metricColumns,
      metricColumnLabels: pdfColumns.metricColumnLabels ?? metricColumnLabels,
      customMetrics,
      labels,
      locale,
      branding,
      clientLabel,
      chartTitles: charts.map((key) =>
        key === "spend_bar" ? t("exportChartSpendBar") : t("exportChartRoasLine")
      ),
      includeTypeColumn: pdfColumns.includeTypeColumn,
      sheetLabels: format === "xlsx" ? sheetLabels : undefined
    });
  }, [
    previewRows,
    format,
    branding,
    groupLabel,
    pdfColumns,
    metricColumnLabels,
    customMetrics,
    labels,
    locale,
    clientLabel,
    charts,
    t,
    sheetLabels
  ]);

  const statusFilterOptions: Array<{ key: CampaignExportStatusFilter; label: string }> = [
    { key: "ACTIVE", label: t("statusActive") },
    { key: "PAUSED", label: t("statusPaused") },
    { key: "DRAFT", label: t("statusDraft") }
  ];

  function toggleStatusFilter(status: CampaignExportStatusFilter) {
    setFilters((cur) => {
      const next = cur.statuses.includes(status)
        ? cur.statuses.filter((s) => s !== status)
        : [...cur.statuses, status];
      return { ...cur, statuses: next };
    });
  }

  function toggleClientFilter(client: string) {
    setFilters((cur) => {
      const next = cur.clients.includes(client)
        ? cur.clients.filter((c) => c !== client)
        : [...cur.clients, client];
      return { ...cur, clients: next };
    });
  }

  function togglePresetFilter(preset: string) {
    setFilters((cur) => {
      const next = cur.presets.includes(preset)
        ? cur.presets.filter((p) => p !== preset)
        : [...cur.presets, preset];
      return { ...cur, presets: next };
    });
  }

  function toggleMetric(key: MetricKey) {
    setMetrics((cur) => {
      if (cur.includes(key)) {
        if (cur.length <= 1) return cur;
        return cur.filter((m) => m !== key);
      }
      return [...cur, key];
    });
  }

  function toggleChart(key: CampaignExportChartKey) {
    setCharts((cur) =>
      cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]
    );
  }

  function toggleCustomCampaign(id: string) {
    setCustomIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function resolveExportError(err: unknown): string {
    if (err instanceof Error) {
      if (err.message === "NO_DATA") return t("exportEmpty");
      if (err.message) return t("exportErrorDetail", { detail: err.message });
    }
    return format === "xlsx" ? t("exportErrorXlsx") : t("exportErrorPdf");
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setErrorMessage(null);
    try {
      const config: CampaignExportConfig = {
        ...exportConfig,
        branding
      };

      await exportCampaignReport({
        groupLabel,
        rows,
        config,
        customMetrics,
        locale,
        labels,
        brandName,
        clientLabel,
        clientSlug,
        metricColumnLabels,
        branding,
        chartLabels: {
          spendBarTitle: t("exportChartSpendBar"),
          spendBarSubtitle: t("exportChartSpendBarHint"),
          roasLineTitle: t("exportChartRoasLine"),
          roasLineSubtitle: t("exportChartRoasLineHint")
        },
        sheetLabels
      });
      onClose();
    } catch (err) {
      console.error("[campaign-export]", err);
      setErrorMessage(resolveExportError(err));
    } finally {
      setExporting(false);
    }
  }

  const primaryDisabled =
    metrics.length === 0 || (scope === "custom" && customIds.length === 0) || !previewRows.length;

  const configurePanel = (
    <div className="space-y-5">
      <section>
        <h3 className="campaign-creator-orion-section-label mb-2">{t("exportBrandingLabel")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">
              {t("exportReportTitleLabel")}
            </span>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="ui-input w-full text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">
              {t("exportAgencyNameLabel")}
            </span>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="ui-input w-full text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">
              {t("exportFooterContactLabel")}
            </span>
            <input
              type="text"
              value={footerContact}
              onChange={(e) => setFooterContact(e.target.value)}
              placeholder={t("exportFooterContactPlaceholder")}
              className="ui-input w-full text-sm"
            />
          </label>
          {tenantBranding?.logoUrl ? (
            <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="accent-[var(--ui-accent)]"
              />
              <span className="text-sm text-[var(--text-main)]">{t("exportIncludeLogo")}</span>
            </label>
          ) : null}
          {whiteLabelReady ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">
                {t("exportAccentColorLabel")}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={resolveExportAccentColor(accentColor)}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[var(--border-color)] bg-transparent p-0.5"
                  aria-label={t("exportAccentColorLabel")}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="ui-input min-w-0 flex-1 font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            </label>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="campaign-creator-orion-section-label mb-2">{t("exportFormatLabel")}</h3>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("exportFormatLabel")}>
          <FormatChoiceCard
            selected={format === "pdf"}
            label={t("exportFormatPdf")}
            description={t("exportFormatPdfHint")}
            icon={FileText}
            onSelect={() => setFormat("pdf")}
          />
          <FormatChoiceCard
            selected={format === "xlsx"}
            label={t("exportFormatXlsx")}
            description={t("exportFormatXlsxHint")}
            icon={FileSpreadsheet}
            onSelect={() => setFormat("xlsx")}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <FilterSelectDropdown
          creatorField
          icon={<Filter size={14} />}
          label={t("exportScopeLabel")}
          placeholder={t("exportScopeLabel")}
          clearable={false}
          value={scope}
          onChange={(v) => setScope((v || "all") as CampaignExportScope)}
          options={scopeOptions}
        />
        {periodReadOnly ? (
          <div className="campaign-creator-sidebar-card-inset px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              {t("exportPeriodLabel")}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-main)]">{periodLabel}</p>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("exportPeriodHint")}</p>
          </div>
        ) : onPeriodChange ? (
          <PeriodFilter creatorField value={period} onChange={onPeriodChange} variant="modal" />
        ) : null}
      </section>

      <section>
        <h3 className="campaign-creator-orion-section-label mb-2">{t("exportFiltersLabel")}</h3>
        <p className="mb-3 text-xs text-[var(--text-dim)]">{t("exportFiltersHint")}</p>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-dim)]">
              {t("exportFilterStatusLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              <MultiSelectChoiceCard
                selected={filters.statuses.length === 0}
                label={t("exportFilterStatusAll")}
                size="sm"
                onToggle={() => setFilters((cur) => ({ ...cur, statuses: [] }))}
              />
              {statusFilterOptions.map(({ key, label }) => (
                <MultiSelectChoiceCard
                  key={key}
                  selected={filters.statuses.includes(key)}
                  label={label}
                  size="sm"
                  onToggle={() => toggleStatusFilter(key)}
                />
              ))}
            </div>
          </div>

          {availableClients.length > 1 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-dim)]">
                {t("exportFilterClientLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                <MultiSelectChoiceCard
                  selected={filters.clients.length === 0}
                  label={t("allClients")}
                  size="sm"
                  onToggle={() => setFilters((cur) => ({ ...cur, clients: [] }))}
                />
                {availableClients.map((client) => (
                  <MultiSelectChoiceCard
                    key={client}
                    selected={filters.clients.includes(client)}
                    label={client}
                    size="sm"
                    onToggle={() => toggleClientFilter(client)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {availablePresets.length > 1 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-dim)]">
                {t("exportFilterTypeLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                <MultiSelectChoiceCard
                  selected={filters.presets.length === 0}
                  label={t("exportFilterTypeAll")}
                  size="sm"
                  onToggle={() => setFilters((cur) => ({ ...cur, presets: [] }))}
                />
                {availablePresets.map((preset) => (
                  <MultiSelectChoiceCard
                    key={preset}
                    selected={filters.presets.includes(preset)}
                    label={resolvePresetLabel(preset)}
                    size="sm"
                    onToggle={() => togglePresetFilter(preset)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {scope === "custom" ? (
        <section>
          <h3 className="campaign-creator-orion-section-label mb-2">{t("exportCustomSelection")}</h3>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-color)] p-2">
            {rows.map((row) => {
              const id = campaignRowId(row as CampaignPdfRow & { metaCampaignId?: string });
              const checked = customIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCustomCampaign(id)}
                    className="accent-[var(--ui-accent)]"
                  />
                  <span className="truncate text-[var(--text-main)]">{row.campaignName}</span>
                  <span className="ml-auto shrink-0 text-xs text-[var(--text-dim)]">{row.clientName}</span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="campaign-creator-orion-section-label mb-2">{t("exportMetricsLabel")}</h3>
        <p className="mb-2 text-xs text-[var(--text-dim)]">
          {t("exportMetricsSelected", { count: metrics.length })}
        </p>
        <div className="flex flex-wrap gap-2">
          {METRIC_CATALOG.map((m) => (
            <MultiSelectChoiceCard
              key={m.key}
              selected={metrics.includes(m.key)}
              label={tMetrics(m.label)}
              size="sm"
              onToggle={() => toggleMetric(m.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="campaign-creator-orion-section-label mb-2">{t("exportChartsLabel")}</h3>
        <p className="mb-2 text-xs text-[var(--text-dim)]">{t("exportChartsHint")}</p>
        <div className="flex flex-wrap gap-2">
          {chartOptions.map(({ key, label, icon: Icon }) => (
            <MultiSelectChoiceCard
              key={key}
              selected={charts.includes(key)}
              label={label}
              icon={Icon}
              iconInline
              size="sm"
              onToggle={() => toggleChart(key)}
            />
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <>
      {errorMessage ? <ExportErrorToast message={errorMessage} /> : null}
      <CreatorModalShell
        open={open}
        onClose={onClose}
        title={t("exportModalTitle")}
        subtitle={t("exportModalSubtitle")}
        titleIcon={<SlidersHorizontal size={16} />}
        width="xl"
        contentClassName="max-h-[min(88vh,920px)] overflow-y-auto"
        onCancel={onClose}
        onClear={() => {
          setFormat("pdf");
          setScope("all");
          setFilters(DEFAULT_EXPORT_FILTERS);
          setMetrics(DEFAULT_EXPORT_METRICS);
          setCharts(DEFAULT_EXPORT_CHARTS);
          setCustomIds([]);
          setReportTitle(groupLabel);
          setAgencyName(tenantBranding?.brandName ?? tenantBranding?.name ?? brandName);
          setIncludeLogo(Boolean(tenantBranding?.logoUrl));
          setAccentColor(DEFAULT_EXPORT_ACCENT);
          setFooterContact("");
        }}
        clearDisabled={
          format === "pdf" &&
          scope === "all" &&
          filters.statuses.length === 0 &&
          filters.clients.length === 0 &&
          filters.presets.length === 0 &&
          metrics.length === DEFAULT_EXPORT_METRICS.length &&
          charts.length === DEFAULT_EXPORT_CHARTS.length &&
          customIds.length === 0 &&
          reportTitle === groupLabel &&
          footerContact === ""
        }
        onPrimary={() => void handleExport()}
        primaryLabel={t("exportModalSubmit")}
        primaryDisabled={primaryDisabled}
        primaryLoading={exporting}
      >
        <div className="space-y-6">
          {configurePanel}

          <section>
            <h3 className="campaign-creator-orion-section-label mb-2">{t("exportTabPreview")}</h3>
            {previewModel ? (
              <CampaignExportPreview
                model={previewModel}
                chartsSectionLabel={t("exportChartsSection")}
                xlsxChartsHint={t("exportPreviewXlsxChartsHint")}
                xlsxPreviewLabel={t("exportPreviewXlsxLabel")}
                emptyLabel={t("exportEmpty")}
              />
            ) : (
              <p className="rounded-xl border border-[var(--creator-card-border,var(--border-color))] py-12 text-center text-sm text-[var(--text-dim)]">
                {t("exportEmpty")}
              </p>
            )}
          </section>
        </div>
      </CreatorModalShell>
    </>
  );
}

export function toCampaignExportRows(
  rows: Array<Record<string, unknown>>
): CampaignPdfRow[] {
  return rows.map((r) => ({
    campaignName: String(r.campaignName ?? ""),
    clientName: String(r.clientName ?? ""),
    status: Boolean(r.isDraft) ? "DRAFT" : (r.status as string | undefined),
    preset: r.preset as string | undefined,
    isDraft: Boolean(r.isDraft) || String(r.metaCampaignId ?? "").startsWith("draft:"),
    spend: Number(r.spend ?? 0),
    conversions: Number(r.conversions ?? 0),
    leads: Number(r.leads ?? 0),
    roas: Number(r.roas ?? 0),
    cpa: r.cpa == null ? null : Number(r.cpa),
    cpl: r.cpl == null ? null : Number(r.cpl),
    impressions: r.impressions == null ? undefined : Number(r.impressions),
    clicks: r.clicks == null ? undefined : Number(r.clicks),
    ctr: r.ctr == null ? undefined : Number(r.ctr),
    metaCampaignId: r.metaCampaignId as string | undefined
  }));
}
