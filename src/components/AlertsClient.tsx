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

function severityVariant(severity: string): "danger" | "warning" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
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
  const [isPending, startTransition] = useTransition();

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

  function dismiss(id: string) {
    startTransition(async () => {
      await fetch(`/api/alerts/${id}/dismiss`, { method: "PATCH" });
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

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label={t("kpiTotal")}
          value={String(counts.all)}
          footer={<p className="mt-1 text-xs text-slate-500">{t("kpiTotalHint")}</p>}
        />
        <KpiCard
          label={t("kpiCritical")}
          value={String(counts.critical)}
          delta={counts.critical > 0 ? t("needsAction") : undefined}
          deltaPositive={false}
          footer={<p className="mt-1 text-xs text-slate-500">{t("kpiCriticalHint")}</p>}
        />
        <KpiCard
          label={t("kpiWarning")}
          value={String(counts.warning)}
          footer={<p className="mt-1 text-xs text-slate-500">{t("kpiWarningHint")}</p>}
        />
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
                    onClick={() => dismiss(a.id)}
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
