"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { periodStateToQuery, PeriodFilter, type PeriodState } from "@/components/PeriodFilter";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { ReportMetricPicker } from "@/components/reports/ReportMetricPicker";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { CardsRowSkeleton, ChartCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_REPORT_METRICS, type ReportPreviewPayload } from "@/lib/report-preview-types";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { clearReportPdfCaptureState } from "@/lib/export-report-pdf";
import {
  loadReportKpiOrder,
  mergeReportKpiOrder,
  saveReportKpiOrder
} from "@/lib/report-kpi-order";
import { BarChart2, BarChart3, Building2, ExternalLink, FileText } from "lucide-react";

import { DsPageHeader } from "@/design-system";

type ScheduleRow = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  format: string;
  frequency: string;
  recipients: string[];
  enabled: boolean;
  nextRunAt: string | null;
};

function formatNextRun(iso: string | null, locale: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ReportsClient() {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const tMetrics = useTranslations("metrics");
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const [isPending, startTransition] = useTransition();

  useCommandStripPage({ hideFilters: true, hideSync: true });

  const clientSlug = strip?.clientFilter ?? "";
  const adAccountId = strip?.accountFilter ?? "";
  const period: PeriodState = strip?.period ?? { preset: "last30", since: "", until: "" };

  const [reportType, setReportType] = useState<"simple" | "complete">("simple");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_REPORT_METRICS);
  const [kpiOrder, setKpiOrder] = useState<MetricKey[]>([]);
  const [kpiEditMode, setKpiEditMode] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");

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

  const loadSchedules = useCallback(() => {
    fetch("/api/report-schedules")
      .then((r) => r.json())
      .then((j) => setSchedules(j.schedules ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    setPreview(null);
  }, [clientSlug, adAccountId, period.preset, period.since, period.until]);

  useEffect(() => {
    if (!strip) return;
    if (reportType === "complete" && period.preset !== "last30" && period.preset !== "custom") {
      strip.setPeriod({ preset: "last30", since: "", until: "" });
    } else if (reportType === "simple" && period.preset === "last30") {
      strip.setPeriod({ preset: "thisWeek", since: "", until: "" });
    }
    setPreview(null);
  }, [reportType, period.preset, strip]);

  const loadPreview = useCallback(async () => {
    if (!selectedClient) {
      setPreviewError(t("selectClientRequired"));
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setMessage(null);
    clearReportPdfCaptureState();

    const goalMetricGuess = selectedMetrics.includes("messages") ? "messages" : "conversions";
    const goalLabel = tMetrics(METRIC_BY_KEY[goalMetricGuess].label);

    const qs = new URLSearchParams(periodQuery);
    qs.set("clientId", selectedClient.slug);
    qs.set("type", reportType);
    qs.set("locale", locale);
    qs.set("goalLabel", goalLabel);
    if (adAccountId) qs.set("adAccountId", adAccountId);

    try {
      const res = await fetch(`/api/reports/preview?${qs}`);
      const json = (await res.json()) as ReportPreviewPayload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setPreview(null);
        setPreviewError(json.error ?? t("previewFailed"));
        return;
      }
      setPreview(json);
      if (json.client.goalMetric && !selectedMetrics.includes(json.client.goalMetric)) {
        setSelectedMetrics((cur) =>
          cur.includes(json.client.goalMetric) ? cur : [...cur, json.client.goalMetric]
        );
      }
    } catch {
      setPreview(null);
      setPreviewError(t("previewFailed"));
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedClient, periodQuery, reportType, locale, t, tMetrics, selectedMetrics, adAccountId]);

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

  function openPrintView() {
    if (!printViewUrl) return;
    window.open(printViewUrl, "_blank", "noopener,noreferrer");
  }

  function createSchedule() {
    if (!scheduleName.trim() || !scheduleEmail.trim()) {
      setMessage(t("scheduleFieldsRequired"));
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/report-schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: scheduleName.trim(),
          clientId: selectedClient?.slug ?? null,
          format: "pdf",
          frequency: scheduleFreq,
          hourUtc: 12,
          recipients: [scheduleEmail.trim()],
          enabled: true
        })
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage(j.error ?? t("scheduleFailed"));
        return;
      }
      setMessage(t("scheduleCreated"));
      setShowScheduleForm(false);
      setScheduleName("");
      setScheduleEmail("");
      loadSchedules();
    });
  }

  function toggleSchedule(id: string, enabled: boolean) {
    startTransition(async () => {
      await fetch(`/api/report-schedules/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !enabled })
      });
      loadSchedules();
    });
  }

  function deleteSchedule(id: string) {
    if (!confirm(t("confirmDeleteSchedule"))) return;
    startTransition(async () => {
      await fetch(`/api/report-schedules/${id}`, { method: "DELETE" });
      loadSchedules();
    });
  }

  return (
    <div className="space-y-6">
      <DsPageHeader
        breadcrumbs={t("breadcrumb")}
        title={t("title")}
        subtitle={t("pageSubtitleNew")}
        titleIcon={<BarChart3 size={16} />}
        actions={
          <>
            <button
              type="button"
              className={preview ? "ui-btn-secondary" : "ui-btn-primary"}
              onClick={() => void loadPreview()}
              disabled={previewLoading || !selectedClient}
            >
              {previewLoading ? tCommon("loading") : preview ? t("refreshPreview") : t("previewReport")}
            </button>
            {preview ? (
              <button
                type="button"
                className="ui-btn-primary inline-flex items-center gap-1.5"
                onClick={openPrintView}
                disabled={!printViewUrl}
                title={t("openPrintViewHint")}
              >
                <ExternalLink size={14} aria-hidden />
                {t("openPrintView")}
              </button>
            ) : null}
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {strip ? (
            <>
              <FilterSelectDropdown
                icon={<Building2 size={14} />}
                label={tDashboard("filterClient")}
                placeholder={tDashboard("filterAllClients")}
                value={strip.clientFilter}
                onChange={strip.setClientFilter}
                options={strip.clientOptions.map((c) => ({ value: c.slug, label: c.name }))}
              />
              <FilterSelectDropdown
                icon={<BarChart2 size={14} />}
                label={tDashboard("filterAccount")}
                placeholder={t("allAdAccounts")}
                value={strip.accountFilter}
                onChange={strip.setAccountFilter}
                disabled={!strip.clientFilter && strip.adAccounts.length === 0}
                options={strip.adAccounts.map((a) => ({ value: a.id, label: a.label }))}
              />
              <PeriodFilter value={period} onChange={strip.setPeriod} variant="commandStrip" />
            </>
          ) : null}
          <FilterSelectDropdown
            icon={<FileText size={14} />}
            label={t("reportTypeLabel")}
            placeholder={t("typeSimple")}
            clearable={false}
            options={[
              { value: "simple", label: t("typeSimple") },
              { value: "complete", label: t("typeComplete") }
            ]}
            value={reportType}
            onChange={(v) => setReportType((v || "simple") as "simple" | "complete")}
          />
        </div>

        <div className="ui-card p-3 sm:p-4">
          <ReportMetricPicker selected={selectedMetrics} onChange={setSelectedMetrics} />
        </div>
      </div>

      {previewError ? <p className="text-xs text-rose-600">{previewError}</p> : null}
      {message ? <p className="text-xs text-[var(--text-dim)]">{message}</p> : null}

      <div className="min-w-0 space-y-6">
        {previewLoading && !preview ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <CardsRowSkeleton />
            <ChartCardSkeleton />
          </div>
        ) : preview ? (
          <div className="ui-card p-4 sm:p-6">
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
          </div>
        ) : (
          <div className="ui-card flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "rgba(245,166,35,0.12)" }}
              aria-hidden
            >
              <BarChart3 size={22} className="text-[var(--amber)]" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-[var(--text-main)]">{t("emptyPreviewTitle")}</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-dim)]">{t("emptyPreviewHint")}</p>
          </div>
        )}

        <section className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--text-main)]">{t("scheduledTitle")}</h2>
            <button
              type="button"
              onClick={() => setShowScheduleForm((v) => !v)}
              className="ui-link text-xs"
            >
              {t("scheduleNew")}
            </button>
          </div>
          {showScheduleForm ? (
            <div className="space-y-2 border-b border-[var(--border-color)] px-4 py-3">
              <input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder={t("scheduleNamePlaceholder")}
                className="ui-input w-full"
              />
              <input
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
                placeholder={t("scheduleEmailPlaceholder")}
                className="ui-input w-full"
              />
              <select
                value={scheduleFreq}
                onChange={(e) => setScheduleFreq(e.target.value as typeof scheduleFreq)}
                className="ui-select w-full"
              >
                <option value="daily">{t("freq.daily")}</option>
                <option value="weekly">{t("freq.weekly")}</option>
                <option value="monthly">{t("freq.monthly")}</option>
              </select>
              <button type="button" onClick={createSchedule} disabled={isPending} className="ui-btn-primary text-sm">
                {t("scheduleSave")}
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-3">{t("colName")}</th>
                  <th className="px-4 py-3">{t("colFrequency")}</th>
                  <th className="px-4 py-3">{t("colRecipients")}</th>
                  <th className="px-4 py-3">{t("colNext")}</th>
                  <th className="px-4 py-3">{t("colStatus")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--text-dim)]">
                      {t("scheduledEmpty")}
                    </td>
                  </tr>
                ) : (
                  schedules.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]">
                      <td className="px-4 py-3 font-medium text-[var(--text-main)]">
                        {row.name}
                        {row.clientName ? (
                          <div className="text-xs font-normal text-[var(--text-dim)]">{row.clientName}</div>
                        ) : (
                          <div className="text-xs font-normal text-[var(--text-dim)]">{t("allClients")}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-dim)]">{t(`freq.${row.frequency}`)}</td>
                      <td className="px-4 py-3 text-[var(--text-dim)]">
                        {t("recipients", { count: row.recipients.length })}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-dim)]">
                        {formatNextRun(row.nextRunAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSchedule(row.id, row.enabled)}
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            row.enabled
                              ? "bg-[rgba(16,185,129,0.12)] text-[var(--success)]"
                              : "bg-[var(--surface-bg)] text-[var(--text-dim)]"
                          }`}
                        >
                          {row.enabled ? t("statusActive") : t("statusPaused")}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteSchedule(row.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          {t("scheduleDelete")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
