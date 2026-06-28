"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { DsPageHeader } from "@/design-system";
import { Calendar } from "lucide-react";

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

export function ReportsScheduleClient() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const [isPending, startTransition] = useTransition();

  useCommandStripPage({ hideFilters: true, hideSync: true });

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [reportsFlags, setReportsFlags] = useState<{
    v3: boolean;
    channels: { email_pdf: boolean; email_link: boolean; whatsapp: boolean };
  }>({
    v3: false,
    channels: { email_pdf: true, email_link: false, whatsapp: false }
  });
  const [scheduleChannel, setScheduleChannel] = useState("email_pdf");
  const [scheduleReportType, setScheduleReportType] = useState<"simple" | "complete">("simple");
  const [schedulePeriod, setSchedulePeriod] = useState("");
  const [schedulePhone, setSchedulePhone] = useState("");

  useEffect(() => {
    fetch("/api/reports/flags")
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) return;
        const channels = j.channels ?? { email_pdf: true, email_link: false, whatsapp: false };
        setReportsFlags({ v3: !!j.v3, channels });
        const firstEnabled =
          (["email_pdf", "email_link", "whatsapp"] as const).find((c) => channels[c]) ?? "email_pdf";
        setScheduleChannel(firstEnabled);
      })
      .catch(() => {});
  }, []);

  const loadSchedules = useCallback(() => {
    fetch("/api/report-schedules")
      .then((r) => r.json())
      .then((j) => setSchedules(j.schedules ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  function createSchedule() {
    const isWhats = reportsFlags.v3 && scheduleChannel === "whatsapp";
    if (!scheduleName.trim() || (isWhats ? !schedulePhone.trim() : !scheduleEmail.trim())) {
      setMessage(t("scheduleFieldsRequired"));
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/report-schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: scheduleName.trim(),
          clientId: strip?.clientOptions.find((c) => c.slug === strip.clientFilter)?.slug ?? null,
          format: "pdf",
          deliveryChannel: reportsFlags.v3 ? scheduleChannel : "email_pdf",
          reportType: reportsFlags.v3 ? scheduleReportType : "simple",
          periodPreset: reportsFlags.v3 && schedulePeriod ? schedulePeriod : null,
          recipientPhone: isWhats ? schedulePhone.trim() : null,
          frequency: scheduleFreq,
          hourUtc: 12,
          recipients: scheduleEmail.trim() ? [scheduleEmail.trim()] : [],
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
      setSchedulePhone("");
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
    <div className="space-y-6" data-reports-schedule-shell>
      <DsPageHeader
        breadcrumbs={t("breadcrumbSchedule")}
        title={t("tabSchedule")}
        subtitle={t("scheduleTabHint")}
        titleIcon={<Calendar size={16} />}
      />

      <div className="min-w-0 space-y-3">
        {message ? <p className="text-xs text-[var(--text-dim)]">{message}</p> : null}
        <section className="campaign-creator-card overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-[var(--creator-card-border,var(--border-color))] px-4 py-3">
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
            <div className="space-y-2 border-b border-[var(--creator-card-border,var(--border-color))] px-4 py-3">
              <input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder={t("scheduleNamePlaceholder")}
                className="ui-input w-full"
              />
              {reportsFlags.v3 ? (
                <select
                  value={scheduleChannel}
                  onChange={(e) => setScheduleChannel(e.target.value)}
                  className="ui-select w-full"
                >
                  {reportsFlags.channels.email_pdf ? (
                    <option value="email_pdf">{t("channel.emailPdf")}</option>
                  ) : null}
                  {reportsFlags.channels.email_link ? (
                    <option value="email_link">{t("channel.emailLink")}</option>
                  ) : null}
                  {reportsFlags.channels.whatsapp ? (
                    <option value="whatsapp">{t("channel.whatsapp")}</option>
                  ) : null}
                </select>
              ) : null}

              {reportsFlags.v3 && scheduleChannel === "whatsapp" ? (
                <input
                  value={schedulePhone}
                  onChange={(e) => setSchedulePhone(e.target.value)}
                  placeholder={t("schedulePhonePlaceholder")}
                  className="ui-input w-full"
                />
              ) : (
                <input
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  placeholder={t("scheduleEmailPlaceholder")}
                  className="ui-input w-full"
                />
              )}

              {reportsFlags.v3 ? (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={scheduleReportType}
                    onChange={(e) =>
                      setScheduleReportType(e.target.value as "simple" | "complete")
                    }
                    className="ui-select w-full"
                  >
                    <option value="simple">{t("typeSimple")}</option>
                    <option value="complete">{t("typeComplete")}</option>
                  </select>
                  <select
                    value={schedulePeriod}
                    onChange={(e) => setSchedulePeriod(e.target.value)}
                    className="ui-select w-full"
                  >
                    <option value="">{t("schedulePeriodDefault")}</option>
                    <option value="last7">last7</option>
                    <option value="last30">last30</option>
                    <option value="thisMonth">thisMonth</option>
                  </select>
                </div>
              ) : null}

              <select
                value={scheduleFreq}
                onChange={(e) => setScheduleFreq(e.target.value as typeof scheduleFreq)}
                className="ui-select w-full"
              >
                <option value="daily">{t("freq.daily")}</option>
                <option value="weekly">{t("freq.weekly")}</option>
                <option value="monthly">{t("freq.monthly")}</option>
              </select>
              <button
                type="button"
                onClick={createSchedule}
                disabled={isPending}
                className="ui-btn-primary text-sm"
              >
                {t("scheduleSave")}
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--creator-card-bg-inset,var(--surface-thead))] text-xs font-semibold uppercase text-[var(--text-dim)]">
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
                    <tr
                      key={row.id}
                      className="border-t border-[var(--creator-card-border,var(--border-color))] hover:bg-[var(--row-hover)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-main)]">
                        {row.name}
                        {row.clientName ? (
                          <div className="text-xs font-normal text-[var(--text-dim)]">
                            {row.clientName}
                          </div>
                        ) : (
                          <div className="text-xs font-normal text-[var(--text-dim)]">
                            {t("allClients")}
                          </div>
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
