"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

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
  { id: "performance", icon: "📊", pages: 8 },
  { id: "executive", icon: "📈", pages: 6 },
  { id: "weekly", icon: "📅", pages: 4 },
  { id: "monthly", icon: "🗓️", pages: 12 },
  { id: "alerts", icon: "🔔", pages: 3 }
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
        body: JSON.stringify({ clientId, days: 7 })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setMessage((j as { error?: string })?.error ?? t("pdfFailed"));
        return;
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="text-violet-600">📊</span>
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{t("pageSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn-secondary">
            {t("whiteLabelModels")}
          </button>
          <button type="button" className="ui-btn-primary" onClick={generateReport} disabled={isPending}>
            {isPending ? tCommon("generating") : t("generateNew")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-900">{t("readyTitle")}</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {READY_REPORTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setTemplate(r.id)}
                  className={`ui-card flex flex-col p-4 text-left transition hover:border-violet-300 hover:shadow-md ${
                    template === r.id ? "border-violet-400 ring-2 ring-violet-200" : ""
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <span className="mt-2 text-sm font-semibold text-slate-900">
                    {t(`ready.${r.id}.title`)}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {t(`ready.${r.id}.desc`)}
                  </span>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {t("standard")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t("pages", { count: r.pages })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

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

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{t("templatesTitle")}</h2>
              <button type="button" className="text-xs font-medium text-violet-600 hover:underline">
                {t("viewAllTemplates")}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 text-center transition hover:border-violet-300"
              >
                <span className="text-2xl text-violet-600">+</span>
                <span className="mt-2 text-xs font-medium text-slate-600">{t("createTemplate")}</span>
              </button>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="min-h-[120px] rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-slate-50 p-3 shadow-sm"
                >
                  <div className="text-xs font-semibold text-slate-800">
                    {t("templatePreview", { n })}
                  </div>
                  <div className="mt-2 h-16 rounded-lg bg-white/80" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="ui-card p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("generatePanelTitle")}</h2>

            <div className="mt-3 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
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
                    scope === key ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedClients[c.id]}
                    onChange={(e) =>
                      setSelectedClients((p) => ({ ...p, [c.id]: e.target.checked }))
                    }
                    className="accent-violet-600"
                  />
                  <span className="text-sm text-slate-800">{c.name}</span>
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
                <div className="ui-input mt-1 flex items-center justify-between text-slate-600">
                  <span>{t("periodValue")}</span>
                  <span className="text-slate-400">▾</span>
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
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600"
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

            {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}

            {format === "whatsapp" && whatsText ? (
              <textarea readOnly value={whatsText} className="ui-textarea mt-3 h-28 text-xs" />
            ) : null}
          </div>

          <div className="ui-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">{t("recentTitle")}</h3>
            <p className="mt-2 text-xs text-slate-500">{t("recentHint")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
