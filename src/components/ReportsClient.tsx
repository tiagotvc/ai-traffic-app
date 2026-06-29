"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { GlobalScopeFilters } from "@/components/layout/GlobalScopeFilters";
import { PageFilterBar } from "@/components/layout/PageFilterBar";
import { ReportMetricPicker } from "@/components/reports/ReportMetricPicker";
import { ReportPreview } from "@/components/reports/ReportPreview";
import {
  exportConsolidatedCsv,
  ReportsConsolidatedPreview,
  type ConsolidatedData
} from "@/components/reports/ReportsConsolidatedPreview";
import { ReportsViewModal } from "@/components/reports/ReportsViewModal";
import type { ReportTemplateConfig } from "@/components/reports/ReportsTemplatesControl";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
import { DEFAULT_REPORT_METRICS, type ReportPreviewPayload } from "@/lib/report-preview-types";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { clearReportPdfCaptureState } from "@/lib/export-report-pdf";
import {
  loadReportKpiOrder,
  mergeReportKpiOrder,
  saveReportKpiOrder
} from "@/lib/report-kpi-order";
import {
  loadReportBreakdownLayout,
  mergeBreakdownLayout,
  serializeBreakdownLayout
} from "@/lib/report-breakdown-layout";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { BarChart3, Download, ExternalLink } from "lucide-react";

import { DsPageHeader } from "@/design-system";

type PreviewMode = "single" | "consolidated" | null;

export function ReportsClient() {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const strip = useCommandStripOptional();

  useCommandStripPage({ hideFilters: true, hideSync: true });

  const clientSlug = strip?.clientFilter ?? "";
  const adAccountId = strip?.accountFilter ?? "";
  const period: PeriodState = strip?.period ?? { preset: "last30", since: "", until: "" };

  const [reportType, setReportType] = useState<"simple" | "complete">("simple");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_REPORT_METRICS);
  const [kpiOrder, setKpiOrder] = useState<MetricKey[]>([]);
  const [kpiEditMode, setKpiEditMode] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewPayload | null>(null);
  const [consolidated, setConsolidated] = useState<ConsolidatedData | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [pendingAiGenerate, setPendingAiGenerate] = useState(false);
  const hasGeneratedRef = useRef(false);
  const skipFilterReloadRef = useRef(false);

  const [reportsFlags, setReportsFlags] = useState<{
    v1: boolean;
    v2: boolean;
  }>({ v1: true, v2: true });

  useEffect(() => {
    fetch("/api/reports/flags")
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) return;
        setReportsFlags({ v1: !!j.v1, v2: !!j.v2 });
      })
      .catch(() => {});
  }, []);

  const periodQuery = useMemo(() => periodStateToQuery(period).toString(), [period]);

  const selectedClient = useMemo(
    () => strip?.clientOptions.find((c) => c.slug === clientSlug) ?? null,
    [strip?.clientOptions, clientSlug]
  );

  useEffect(() => {
    clearReportPdfCaptureState();
    setKpiOrder(loadReportKpiOrder());
  }, []);

  const kpiMetrics = useMemo(
    () => mergeReportKpiOrder(selectedMetrics, kpiOrder),
    [selectedMetrics, kpiOrder]
  );

  function handleKpiReorder(order: MetricKey[]) {
    const rest = selectedMetrics.filter((k) => !order.includes(k));
    const next = [...order, ...rest];
    setKpiOrder(next);
    saveReportKpiOrder(next);
  }

  useEffect(() => {
    if (!strip || strip.clientFilter || !strip.clientOptions[0]) return;
    strip.setClientFilter(strip.clientOptions[0].slug);
  }, [strip]);

  const loadConsolidated = useCallback(
    async (periodOverride?: PeriodState) => {
      setPreviewLoading(true);
      setPreviewError(null);
      setMessage(null);
      setPreview(null);
      setConsolidated(null);
      setPreviewMode(null);

      const periodForQuery = periodOverride ?? period;
      const qs = periodStateToQuery(periodForQuery);
      qs.set("locale", locale);

      try {
        const res = await fetch(`/api/reports/consolidated?${qs}`);
        const j = await res.json();
        if (!j?.ok) {
          setPreviewError(t("previewFailed"));
          return;
        }
        setConsolidated(j as ConsolidatedData);
        setPreviewMode("consolidated");
        hasGeneratedRef.current = true;
      } catch {
        setPreviewError(t("previewFailed"));
      } finally {
        setPreviewLoading(false);
      }
    },
    [period, locale, t]
  );

  const loadPreview = useCallback(
    async (overrides?: {
      reportType?: "simple" | "complete";
      metrics?: MetricKey[];
      periodPreset?: string | null;
    }) => {
      if (!selectedClient) {
        setPreviewError(t("selectClientRequired"));
        return;
      }

      const effectiveReportType = overrides?.reportType ?? reportType;
      const effectiveMetrics = overrides?.metrics ?? selectedMetrics;
      const periodForQuery: PeriodState = overrides?.periodPreset
        ? { preset: overrides.periodPreset as PeriodState["preset"], since: "", until: "" }
        : period;

      setPreviewLoading(true);
      setPreviewError(null);
      setMessage(null);
      setConsolidated(null);
      setPreview(null);
      setPreviewMode(null);
      clearReportPdfCaptureState();

      const goalMetricGuess = effectiveMetrics.includes("messages") ? "messages" : "conversions";
      const goalLabel = tMetrics(METRIC_BY_KEY[goalMetricGuess].label);

      const qs = periodStateToQuery(periodForQuery);
      qs.set("clientId", selectedClient.slug);
      qs.set("type", effectiveReportType);
      qs.set("locale", locale);
      qs.set("goalLabel", goalLabel);
      if (adAccountId) qs.set("adAccountId", adAccountId);

      try {
        const res = await fetch(`/api/reports/preview?${qs}`);
        const json = (await res.json()) as ReportPreviewPayload & { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setPreviewError(json.error ?? t("previewFailed"));
          return;
        }
        setPreview(json);
        setPreviewMode("single");
        hasGeneratedRef.current = true;
        if (json.client.goalMetric && !effectiveMetrics.includes(json.client.goalMetric)) {
          setSelectedMetrics((cur) =>
            cur.includes(json.client.goalMetric) ? cur : [...cur, json.client.goalMetric]
          );
        }
      } catch {
        setPreviewError(t("previewFailed"));
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedClient, period, reportType, locale, t, tMetrics, selectedMetrics, adAccountId]
  );

  useEffect(() => {
    if (!hasGeneratedRef.current) return;
    if (skipFilterReloadRef.current) {
      skipFilterReloadRef.current = false;
      return;
    }
    if (previewMode === "consolidated") {
      void loadConsolidated();
      return;
    }
    if (previewMode === "single" && selectedClient) {
      void loadPreview();
    }
  }, [
    clientSlug,
    adAccountId,
    period.preset,
    period.since,
    period.until,
    selectedMetrics,
    reportType,
    previewMode,
    loadConsolidated,
    loadPreview,
    selectedClient
  ]);

  useEffect(() => {
    if (!strip) return;
    if (reportType === "complete" && period.preset !== "last30" && period.preset !== "custom") {
      strip.setPeriod({ preset: "last30", since: "", until: "" });
    } else if (reportType === "simple" && period.preset === "last30") {
      strip.setPeriod({ preset: "thisWeek", since: "", until: "" });
    }
  }, [reportType, period.preset, strip]);

  const printViewUrl = useMemo(() => {
    if (!selectedClient || !preview) return null;
    const qs = new URLSearchParams();
    qs.set("clientId", selectedClient.slug);
    qs.set("period", period.preset);
    if (period.preset === "custom" && period.since && period.until) {
      qs.set("since", period.since);
      qs.set("until", period.until);
    }
    qs.set("type", reportType);
    qs.set("locale", locale);
    qs.set("metrics", kpiMetrics.join(","));
    if (preview.breakdowns?.length) {
      const types = preview.breakdowns.map((b) => b.type);
      const layout = mergeBreakdownLayout(types, loadReportBreakdownLayout());
      qs.set("breakdownLayout", serializeBreakdownLayout(layout));
    }
    if (adAccountId) qs.set("adAccountId", adAccountId);
    const goalMetric =
      selectedMetrics.includes("messages") ? "messages" : preview.client.goalMetric;
    qs.set("goalLabel", tMetrics(METRIC_BY_KEY[goalMetric].label));
    return `/${locale}/report-print?${qs.toString()}`;
  }, [
    selectedClient,
    preview,
    period.preset,
    period.since,
    period.until,
    reportType,
    locale,
    kpiMetrics,
    adAccountId,
    selectedMetrics,
    preview?.client.goalMetric,
    tMetrics
  ]);

  useEffect(() => {
    if (!pendingAiGenerate || !selectedClient) return;
    setPendingAiGenerate(false);
    skipFilterReloadRef.current = true;
    void loadPreview();
  }, [pendingAiGenerate, selectedClient, loadPreview]);

  async function generateByAi(prompt: string): Promise<boolean> {
    if (!prompt.trim() || !strip) return false;
    setAiBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reports/ai-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const j = await res.json();
      if (!res.ok || !j.ok || !j.config) {
        setMessage(j.error ?? t("aiGenerateFailed"));
        return false;
      }
      const c = j.config as {
        clientSlug: string | null;
        periodPreset: string;
        reportType: "simple" | "complete";
        metrics: string[];
      };
      if (c.clientSlug) strip.setClientFilter(c.clientSlug);
      if (c.periodPreset)
        strip.setPeriod({ preset: c.periodPreset as PeriodState["preset"], since: "", until: "" });
      if (c.reportType) setReportType(c.reportType);
      if (Array.isArray(c.metrics) && c.metrics.length) {
        const valid = c.metrics.filter((m) => m in METRIC_BY_KEY) as MetricKey[];
        if (valid.length) setSelectedMetrics(valid.slice(0, 6));
      }
      setPendingAiGenerate(true);
      return true;
    } catch {
      setMessage(t("aiGenerateFailed"));
      return false;
    } finally {
      setAiBusy(false);
    }
  }

  function applyStandardGeneration(config: {
    reportType: "simple" | "complete";
    kind: "single" | "consolidated";
    metrics?: string[];
    periodPreset?: string | null;
  }) {
    skipFilterReloadRef.current = true;

    const nextMetrics = config.metrics?.length
      ? (config.metrics.filter((m) => m in METRIC_BY_KEY) as MetricKey[])
      : undefined;

    if (config.kind === "consolidated") {
      const nextPeriod: PeriodState | undefined = config.periodPreset
        ? { preset: config.periodPreset as PeriodState["preset"], since: "", until: "" }
        : undefined;
      if (nextPeriod && strip) strip.setPeriod(nextPeriod);
      void loadConsolidated(nextPeriod);
      return;
    }

    if (config.reportType) setReportType(config.reportType);
    if (nextMetrics?.length) setSelectedMetrics(nextMetrics);
    if (config.periodPreset && strip) {
      strip.setPeriod({
        preset: config.periodPreset as PeriodState["preset"],
        since: "",
        until: ""
      });
    }

    void loadPreview({
      reportType: config.reportType,
      metrics: nextMetrics,
      periodPreset: config.periodPreset
    });
  }

  function openPrintView() {
    if (!printViewUrl) return;
    window.open(printViewUrl, "_blank", "noopener,noreferrer");
  }

  function downloadCsv() {
    if (consolidated) {
      exportConsolidatedCsv(consolidated, (key) => tMetrics(key));
      return;
    }
    if (!selectedClient) return;
    const qs = new URLSearchParams(periodQuery);
    qs.set("clientId", selectedClient.slug);
    qs.set("type", reportType);
    qs.set("locale", locale);
    if (preview) qs.set("goalLabel", tMetrics(METRIC_BY_KEY[preview.client.goalMetric].label));
    if (adAccountId) qs.set("adAccountId", adAccountId);
    window.open(`/api/reports/export?${qs.toString()}`, "_blank", "noopener,noreferrer");
  }

  const hasPreview = previewMode === "single" ? !!preview : previewMode === "consolidated" ? !!consolidated : false;
  const currentTemplateConfig: ReportTemplateConfig = {
    reportType,
    metrics: selectedMetrics,
    periodPreset: period.preset
  };

  return (
    <div className="space-y-6" data-reports-shell>
      <OrionTrafficLoadingOverlay
        open={previewLoading}
        title={t("previewLoadingTitle")}
        message={t("previewLoadingMessage")}
      />

      <DsPageHeader
        breadcrumbs={t("breadcrumbBuild")}
        title={t("tabReport")}
        subtitle={t("pageSubtitleNew")}
        titleIcon={<BarChart3 size={16} />}
        actions={
          <>
            <FilterToggleButton
              open={showFilters}
              showLabel={t("showFilters")}
              hideLabel={t("hideFilters")}
              onClick={() => setShowFilters((v) => !v)}
            />
            {reportsFlags.v1 ? (
              <button
                type="button"
                className="ui-btn-primary text-xs"
                onClick={() => setViewModalOpen(true)}
              >
                {t("previewReport")}
              </button>
            ) : null}
          </>
        }
      />

      <div className="space-y-3">
        {showFilters ? (
          <>
            <PageFilterBar className="mt-0">
              {strip ? (
                <GlobalScopeFilters
                  layout="flat"
                  creatorField
                  clientFilter={strip.clientFilter}
                  setClientFilter={strip.setClientFilter}
                  accountFilter={strip.accountFilter}
                  setAccountFilter={strip.setAccountFilter}
                  period={period}
                  setPeriod={strip.setPeriod}
                  clientOptions={strip.clientOptions}
                  adAccounts={strip.adAccounts}
                  compact
                />
              ) : null}
              {reportsFlags.v1 ? (
                <ReportMetricPicker selected={selectedMetrics} onChange={setSelectedMetrics} />
              ) : null}
            </PageFilterBar>
          </>
        ) : null}
      </div>

      {!reportsFlags.v1 && !reportsFlags.v2 ? (
        <p className="text-xs text-[var(--text-dim)]">{t("reportsAllDisabled")}</p>
      ) : null}

      {previewError ? <p className="text-xs text-rose-600">{previewError}</p> : null}
      {message ? <p className="text-xs text-[var(--text-dim)]">{message}</p> : null}

      <div className="min-w-0">
        {!previewLoading && hasPreview ? (
          <div className="campaign-creator-card !p-4 sm:!p-6">
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="ui-btn-secondary text-xs"
                onClick={() => setViewModalOpen(true)}
              >
                {t("changeTemplate")}
              </button>
              <button
                type="button"
                className="ui-btn-secondary inline-flex items-center gap-1.5 text-xs"
                onClick={downloadCsv}
                title={t("exportCsvHint")}
              >
                <Download size={14} aria-hidden />
                {t("exportCsv")}
              </button>
              {previewMode === "single" && preview ? (
                <button
                  type="button"
                  className="ui-btn-primary inline-flex items-center gap-1.5 text-xs"
                  onClick={openPrintView}
                  disabled={!printViewUrl}
                  title={t("openPrintViewHint")}
                >
                  <ExternalLink size={14} aria-hidden />
                  {t("openPrintView")}
                </button>
              ) : null}
            </div>
            {previewMode === "consolidated" && consolidated ? (
              <ReportsConsolidatedPreview
                data={consolidated}
                locale={locale}
                onExportCsv={downloadCsv}
              />
            ) : preview ? (
              <ReportPreview
                data={preview}
                selectedMetrics={selectedMetrics}
                kpiMetrics={kpiMetrics}
                kpiEditMode={kpiEditMode}
                onKpiEditModeChange={setKpiEditMode}
                onKpiReorder={handleKpiReorder}
                reportType={reportType}
                periodQuery={periodQuery}
                adAccountId={adAccountId || undefined}
              />
            ) : null}
          </div>
        ) : !previewLoading ? (
          <div className="campaign-creator-card flex min-h-[420px] flex-col items-center justify-center !p-8 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)]"
              aria-hidden
            >
              <BarChart3 size={22} className="text-[var(--ui-accent)]" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-[var(--text-main)]">
              {t("emptyPreviewTitle")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-dim)]">{t("emptyPreviewHint")}</p>
          </div>
        ) : null}
      </div>

      <ReportsViewModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        reportsV2={reportsFlags.v2}
        onApplyStandard={applyStandardGeneration}
        onGenerateAi={generateByAi}
        aiBusy={aiBusy}
        currentReportType={reportType}
        currentConfig={currentTemplateConfig}
      />
    </div>
  );
}
