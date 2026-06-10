"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { SyncNowButton } from "@/components/SyncNowButton";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Link } from "@/i18n/navigation";

type AlertRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  clientName: string | null;
  clientSlug: string | null;
  metaCampaignId: string | null;
  metricKey: string | null;
  actualValue: number | null;
  thresholdValue: number | null;
  createdAt: string;
};

type AlertFilter = "all" | "critical" | "warning";

type StatBucket = { total: number; critical: number; warning: number };
type AlertStats = { days: number; current: StatBucket; previous: StatBucket } | null;
const PERIOD_OPTIONS = [7, 15, 30] as const;

function severityVariant(severity: string): "danger" | "warning" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

function buildDelta(
  cur: number,
  prev: number,
  vsLabel: string
): { text?: string; positive: boolean } {
  const diff = cur - prev;
  if (diff === 0) return { positive: true };
  const pct = prev > 0 ? Math.round((Math.abs(diff) / prev) * 100) : null;
  const pctStr = pct != null ? ` (${pct}%)` : "";
  const sign = diff > 0 ? "+" : "−";
  // Menos alertas = melhor (verde); mais alertas = pior (vermelho).
  return { text: `${sign}${Math.abs(diff)}${pctStr} ${vsLabel}`, positive: diff < 0 };
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AlertsClient() {
  const t = useTranslations("alertsPage");
  const locale = useLocale();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<AlertStats>(null);
  const [isPending, startTransition] = useTransition();

  const loadStats = useCallback(() => {
    fetch(`/api/alerts/stats?days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setStats({ days: j.days, current: j.current, previous: j.previous });
      })
      .catch(() => {});
  }, [days]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (q) params.set("q", q);
    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((j) => setAlerts(j.alerts ?? []))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tmr = window.setTimeout(() => setQ(searchInput.trim()), 300);
    return () => window.clearTimeout(tmr);
  }, [searchInput]);

  const counts = useMemo(
    () => ({
      all: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length
    }),
    [alerts]
  );

  const visible = useMemo(() => {
    if (filter === "critical") return alerts.filter((a) => a.severity === "critical");
    if (filter === "warning") return alerts.filter((a) => a.severity === "warning");
    return alerts;
  }, [alerts, filter]);

  function patchAlert(id: string, action: "dismiss" | "snooze" | "acknowledge") {
    startTransition(async () => {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, snoozeHours: 24 })
      });
      load();
      router.refresh();
    });
  }

  function typeLabel(type: string) {
    const key = `types.${type}` as const;
    return t.has(key) ? t(key) : type;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={t("breadcrumb")}
        actions={
          <>
            <SyncNowButton />
            <Link href="/automations" className="ui-btn-secondary text-sm">
              {t("automationsLink")}
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{t("periodCompareTitle")}</div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {PERIOD_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                days === d ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t("periodDays", { days: d })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(() => {
          const cur = stats?.current;
          const prev = stats?.previous;
          const vs = t("vsPrevious");
          const dTotal = cur && prev ? buildDelta(cur.total, prev.total, vs) : { positive: true };
          const dCrit = cur && prev ? buildDelta(cur.critical, prev.critical, vs) : { positive: true };
          const dWarn = cur && prev ? buildDelta(cur.warning, prev.warning, vs) : { positive: true };
          return (
            <>
              <KpiCard
                label={t("kpiTotal")}
                value={cur ? String(cur.total) : "—"}
                delta={dTotal.text}
                deltaPositive={dTotal.positive}
                footer={<p className="mt-1 text-xs text-slate-500">{t("kpiTotalHint")}</p>}
              />
              <KpiCard
                label={t("kpiCritical")}
                value={cur ? String(cur.critical) : "—"}
                delta={dCrit.text}
                deltaPositive={dCrit.positive}
                footer={<p className="mt-1 text-xs text-slate-500">{t("kpiCriticalHint")}</p>}
              />
              <KpiCard
                label={t("kpiWarning")}
                value={cur ? String(cur.warning) : "—"}
                delta={dWarn.text}
                deltaPositive={dWarn.positive}
                footer={<p className="mt-1 text-xs text-slate-500">{t("kpiWarningHint")}</p>}
              />
            </>
          );
        })()}
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", t("tabAll", { count: counts.all })],
                ["critical", t("tabCritical", { count: counts.critical })],
                ["warning", t("tabWarning", { count: counts.warning })]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  filter === key ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("search")}
            className="ui-input w-full sm:max-w-xs"
          />
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : alerts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-800">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-slate-500">{t("emptyHint")}</p>
            <Link href="/clients" className="mt-4 inline-block text-sm font-medium text-violet-600 hover:underline">
              {t("configureGoals")}
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("filterEmpty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((a) => (
              <div
                key={a.id}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${
                  a.severity === "critical"
                    ? "bg-red-50/30"
                    : a.severity === "warning"
                      ? "bg-amber-50/20"
                      : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(a.severity)}>
                      {a.severity === "critical" ? t("severityCritical") : t("severityWarning")}
                    </Badge>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {typeLabel(a.type)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatWhen(a.createdAt, locale)}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{a.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{a.description}</p>
                  {a.clientName ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {t("clientLabel")}: {a.clientName}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {a.clientSlug && a.metaCampaignId ? (
                    <Link
                      href={`/campaigns/${a.metaCampaignId}?client=${encodeURIComponent(a.clientSlug)}`}
                      className="ui-btn-secondary text-xs"
                    >
                      {t("openCampaign")}
                    </Link>
                  ) : a.clientSlug ? (
                    <Link href={`/clients/${a.clientSlug}`} className="ui-btn-secondary text-xs">
                      {t("openClient")}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => patchAlert(a.id, "snooze")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t("snooze")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => patchAlert(a.id, "acknowledge")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t("acknowledge")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => patchAlert(a.id, "dismiss")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t("dismiss")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
