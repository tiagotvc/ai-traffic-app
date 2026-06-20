"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { ReportMetricPicker } from "@/components/reports/ReportMetricPicker";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { CardsRowSkeleton, ChartCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_REPORT_METRICS, type ReportPreviewPayload } from "@/lib/report-preview-types";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

type ClientOption = { id: string; slug: string; name: string };

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
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientSlug, setSelectedClientSlug] = useState("");
  const [reportType, setReportType] = useState<"simple" | "complete">("simple");
  const [period, setPeriod] = useState<PeriodState>({ preset: "thisWeek", since: "", until: "" });
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_REPORT_METRICS);
  const [preview, setPreview] = useState<ReportPreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reportEmail, setReportEmail] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");

  const periodQuery = useMemo(() => periodStateToQuery(period).toString(), [period]);

  const selectedClient = clients.find((c) => c.slug === selectedClientSlug) ?? clients[0];

  const loadSchedules = useCallback(() => {
    fetch("/api/report-schedules")
      .then((r) => r.json())
      .then((j) => setSchedules(j.schedules ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => {
        const list = j.clients ?? [];
        setClients(list);
        if (list[0]) setSelectedClientSlug(list[0].slug);
      })
      .catch(() => {});
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    setPeriod((current) => {
      if (reportType === "complete" && current.preset !== "last30" && current.preset !== "custom") {
        return { preset: "last30", since: "", until: "" };
      }
      if (reportType === "simple" && current.preset === "last30") {
        return { preset: "thisWeek", since: "", until: "" };
      }
      return current;
    });
    setPreview(null);
  }, [reportType]);

  const loadPreview = useCallback(async () => {
    if (!selectedClient) {
      setPreviewError(t("selectClientRequired"));
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setMessage(null);

    const goalMetricGuess = selectedMetrics.includes("messages") ? "messages" : "conversions";
    const goalLabel = tMetrics(METRIC_BY_KEY[goalMetricGuess].label);

    const qs = new URLSearchParams(periodQuery);
    qs.set("clientId", selectedClient.slug);
    qs.set("type", reportType);
    qs.set("locale", locale);
    qs.set("goalLabel", goalLabel);

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
  }, [selectedClient, periodQuery, reportType, locale, t, tMetrics, selectedMetrics]);

  function exportPdf() {
    if (!selectedClient) return;
    setMessage(null);
    startTransition(async () => {
      const days = period.preset === "last30" ? 30 : period.preset === "last14" ? 14 : 7;
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.slug,
          days,
          template: reportType === "complete" ? "executive" : "performance",
          ...(reportEmail.trim() ? { email: reportEmail.trim() } : {})
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setMessage((j as { error?: string })?.error ?? t("pdfFailed"));
        return;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const j = await res.json();
        if (j.emailed) {
          setMessage(t("pdfEmailed", { email: j.to }));
          return;
        }
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${selectedClient.slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(t("pdfDownloaded"));
    });
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
      <PageHeader
        title={t("title")}
        subtitle={t("pageSubtitleNew")}
        breadcrumbs={t("breadcrumb")}
        actions={
          preview ? (
            <>
              <button type="button" className="ui-btn-secondary" onClick={loadPreview} disabled={previewLoading}>
                {previewLoading ? tCommon("loading") : t("refreshPreview")}
              </button>
              <button
                type="button"
                className="ui-btn-primary"
                onClick={exportPdf}
                disabled={isPending || !selectedClient}
              >
                {isPending ? tCommon("generating") : t("exportPdf")}
              </button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="ui-card space-y-4 p-4">
            <div>
              <div className="ui-label">{t("clientLabel")}</div>
              <select
                value={selectedClientSlug}
                onChange={(e) => {
                  setSelectedClientSlug(e.target.value);
                  setPreview(null);
                }}
                className="ui-select mt-1 w-full"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">{t("oneClientHint")}</p>
            </div>

            <div>
              <div className="ui-label">{t("reportTypeLabel")}</div>
              <div className="mt-1 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    ["simple", t("typeSimple")],
                    ["complete", t("typeComplete")]
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setReportType(key);
                      setPreview(null);
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                      reportType === key ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {reportType === "simple" ? t("typeSimpleHint") : t("typeCompleteHint")}
              </p>
            </div>

            <div>
              <div className="ui-label">{t("periodLabel")}</div>
              <div className="mt-1">
                <PeriodFilter
                  value={period}
                  onChange={(next) => {
                    setPeriod(next);
                    setPreview(null);
                  }}
                />
              </div>
            </div>

            <ReportMetricPicker selected={selectedMetrics} onChange={setSelectedMetrics} />

            <button
              type="button"
              className="ui-btn-primary w-full"
              onClick={() => void loadPreview()}
              disabled={previewLoading || !selectedClient}
            >
              {previewLoading ? tCommon("loading") : t("previewReport")}
            </button>

            {previewError ? <p className="text-xs text-rose-600">{previewError}</p> : null}
          </div>

          <div className="ui-card space-y-3 p-4">
            <div className="text-sm font-semibold text-slate-900">{t("exportSectionTitle")}</div>
            <p className="text-xs text-slate-500">{t("exportSectionHint")}</p>
            <label className="block text-xs font-medium text-slate-600">{t("emailOptional")}</label>
            <input
              type="email"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="ui-input w-full"
            />
            <button
              type="button"
              className="ui-btn-secondary w-full"
              onClick={exportPdf}
              disabled={isPending || !preview || !selectedClient}
            >
              {isPending ? tCommon("generating") : t("exportPdf")}
            </button>
            {message ? <p className="text-xs text-slate-500">{message}</p> : null}
          </div>
        </aside>

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
                reportType={reportType}
                periodQuery={periodQuery}
              />
            </div>
          ) : (
            <div className="ui-card flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl">📊</div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{t("emptyPreviewTitle")}</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">{t("emptyPreviewHint")}</p>
            </div>
          )}

          <section className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{t("scheduledTitle")}</h2>
              <button
                type="button"
                onClick={() => setShowScheduleForm((v) => !v)}
                className="text-xs font-medium text-violet-600 hover:underline"
              >
                {t("scheduleNew")}
              </button>
            </div>
            {showScheduleForm ? (
              <div className="space-y-2 border-b border-slate-100 px-4 py-3">
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
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
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
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        {t("scheduledEmpty")}
                      </td>
                    </tr>
                  ) : (
                    schedules.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.name}
                          {row.clientName ? (
                            <div className="text-xs font-normal text-slate-500">{row.clientName}</div>
                          ) : (
                            <div className="text-xs font-normal text-slate-500">{t("allClients")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t(`freq.${row.frequency}`)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {t("recipients", { count: row.recipients.length })}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatNextRun(row.nextRunAt, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSchedule(row.id, row.enabled)}
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              row.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
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
    </div>
  );
}
