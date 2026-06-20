"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { DsPageHeader } from "@/design-system";

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

const READY_REPORTS = [
  { id: "performance", icon: "📊", days: 7 },
  { id: "executive", icon: "📈", days: 30 }
] as const;

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
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClients, setSelectedClients] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<"client" | "group">("client");
  const [template, setTemplate] = useState("performance");
  const [format, setFormat] = useState<"pdf" | "whatsapp">("pdf");
  const [whatsText, setWhatsText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [clientQ, setClientQ] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [reportEmail, setReportEmail] = useState("");
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
        const sel: Record<string, boolean> = {};
        if (list[0]) sel[list[0].id] = true;
        setSelectedClients(sel);
      })
      .catch(() => {});
    loadSchedules();
  }, [loadSchedules]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientQ.toLowerCase())
  );

  const selectedClientIds = Object.entries(selectedClients)
    .filter(([, on]) => on)
    .map(([id]) => id);

  const primaryClient = clients.find((c) => selectedClients[c.id]) ?? clients[0];

  function generateReport() {
    setMessage(null);
    const clientId =
      scope === "client" && primaryClient
        ? primaryClient.slug
        : selectedClientIds[0]
          ? clients.find((c) => c.id === selectedClientIds[0])?.slug
          : undefined;

    startTransition(async () => {
      if (format === "whatsapp") {
        const res = await fetch("/api/reports/whatsapp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId, days: 7 })
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          text?: string;
          error?: string;
        };
        if (!res.ok || !json?.ok) {
          setMessage(json?.error ?? t("generateFailed"));
          return;
        }
        setWhatsText(json.text ?? "");
        setMessage(t("whatsappGenerated"));
        return;
      }
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          days: READY_REPORTS.find((r) => r.id === template)?.days ?? 7,
          template,
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
      a.download = `relatorio-${primaryClient?.slug ?? "cliente"}.pdf`;
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
          clientId: primaryClient?.slug ?? primaryClient?.id ?? null,
          format,
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
        subtitle={t("pageSubtitle")}
        actions={
          <>
            <button type="button" className="ui-btn-secondary">
              {t("whiteLabelModels")}
            </button>
            <button type="button" className="ui-btn-primary" onClick={generateReport} disabled={isPending}>
              {isPending ? tCommon("generating") : t("generateNew")}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-main)]">{t("readyTitle")}</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {READY_REPORTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setTemplate(r.id)}
                  className={`ui-card flex flex-col p-4 text-left transition hover:border-[var(--amber)]/40 hover:shadow-md ${
                    template === r.id ? "border-[var(--amber)] ring-2 ring-[rgba(245,166,35,0.2)]" : ""
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <span className="mt-2 text-sm font-semibold text-[var(--text-main)]">
                    {t(`ready.${r.id}.title`)}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-[var(--text-dim)]">
                    {t(`ready.${r.id}.desc`)}
                  </span>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-md bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--success)]">
                      {t("templateAvailable")}
                    </span>
                    <span className="text-[10px] text-[var(--text-dimmer)]">
                      {t("periodDays", { count: r.days })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="ui-label block">{t("emailOptional")}</label>
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="ui-input mt-1 w-full max-w-md"
              />
              <p className="mt-1 text-[11px] text-[var(--text-dimmer)]">{t("emailHint")}</p>
            </div>
          </section>

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

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-main)]">{t("templatesTitle")}</h2>
              <button type="button" className="ui-link text-xs">
                {t("viewAllTemplates")}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                className="ui-card flex min-h-[120px] flex-col items-center justify-center border-2 border-dashed p-4 text-center transition hover:border-[var(--amber)]/40"
              >
                <span className="text-2xl text-[var(--violet)]">+</span>
                <span className="mt-2 text-xs font-medium text-[var(--text-dim)]">{t("createTemplate")}</span>
              </button>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="ui-card min-h-[120px] bg-gradient-to-br from-[rgba(124,58,237,0.06)] to-[var(--surface-bg)] p-3"
                >
                  <div className="text-xs font-semibold text-[var(--text-main)]">
                    {t("templatePreview", { n })}
                  </div>
                  <div className="mt-2 h-16 rounded-lg bg-[var(--surface-card)]/80" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="ui-card p-4">
            <h2 className="text-sm font-semibold text-[var(--text-main)]">{t("generatePanelTitle")}</h2>

            <div className="mt-3 flex rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-1">
              {(
                [
                  ["client", t("scopeClient")],
                  ["group", t("scopeGroup")]
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                    scope === key
                      ? "bg-[var(--surface-card)] text-[var(--amber)] shadow-sm"
                      : "text-[var(--text-dim)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={clientQ}
              onChange={(e) => setClientQ(e.target.value)}
              placeholder={t("searchClients")}
              className="ui-input mt-3"
            />

            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {filteredClients.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--row-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedClients[c.id]}
                    onChange={(e) =>
                      setSelectedClients((p) => ({ ...p, [c.id]: e.target.checked }))
                    }
                    className="accent-violet-600"
                  />
                  <span className="text-sm text-[var(--text-main)]">{c.name}</span>
                </label>
              ))}
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="ui-label">{t("modelLabel")}</div>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="ui-select mt-1"
                >
                  {READY_REPORTS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {t(`ready.${r.id}.title`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="ui-label">{t("periodLabel")}</div>
                <div className="ui-input mt-1 flex items-center justify-between text-[var(--text-dim)]">
                  <span>{t("periodValue")}</span>
                  <span className="text-[var(--text-dimmer)]">▾</span>
                </div>
              </div>
              <div>
                <div className="ui-label">{t("formatLabel")}</div>
                <div className="mt-1 flex gap-2">
                  {(
                    [
                      ["pdf", "PDF"],
                      ["whatsapp", "WhatsApp"]
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormat(key)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-medium ${
                        format === key
                          ? "border-[var(--amber)] bg-[rgba(245,166,35,0.08)] text-[var(--amber)]"
                          : "border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-dim)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending || (scope === "client" && !primaryClient)}
              onClick={generateReport}
              className="ui-btn-primary mt-4 w-full"
            >
              {isPending ? tCommon("generating") : t("generateNew")}
            </button>

            {message ? <p className="mt-2 text-xs text-[var(--text-dim)]">{message}</p> : null}

            {format === "whatsapp" && whatsText ? (
              <textarea readOnly value={whatsText} className="ui-textarea mt-3 h-28 text-xs" />
            ) : null}
          </div>

          <div className="ui-card p-4">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">{t("recentTitle")}</h3>
            <p className="mt-2 text-xs text-[var(--text-dim)]">{t("recentHint")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
