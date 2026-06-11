"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { SyncNowButton } from "@/components/SyncNowButton";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";

type Level = "general" | "client" | "campaign";

type VariationItem = {
  id: string;
  entityType: Level;
  entityName: string | null;
  clientSlug: string | null;
  metaCampaignId: string | null;
  metric: MetricKey;
  currentValue: number;
  previousValue: number;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
};

type ClientRow = { id: string; slug: string; name: string };

const PERIOD_OPTIONS = [7, 15, 30] as const;
const LEVELS: Level[] = ["general", "client", "campaign"];

function severityVariant(s: VariationItem["severity"]): "danger" | "warning" | "success" {
  if (s === "critical") return "danger";
  if (s === "positive") return "success";
  return "warning";
}

export function AlertsClient() {
  const t = useTranslations("alertsPage");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();

  const [days, setDays] = useState<number>(30);
  const [level, setLevel] = useState<Level>("client");
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<VariationItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, worse: 0, better: 0 });
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days), level });
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/alerts/variations?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setItems(j.items ?? []);
          setCounts(j.counts ?? { total: 0, worse: 0, better: 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days, level, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onSync = () => load();
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load]);

  const levelLabel = (l: Level) =>
    l === "general" ? t("levelGeneral") : l === "client" ? t("levelClient") : t("levelCampaign");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("variationsSubtitle")}
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

      {/* Controles: período + nível + cliente */}
      <div className="flex flex-wrap items-center gap-3">
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

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                level === l ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {levelLabel(l)}
            </button>
          ))}
        </div>

        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="ui-select !w-auto !py-1.5 text-xs"
        >
          <option value="">{t("filterClientAll")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpiVariations")} value={String(counts.total)} />
        <KpiCard
          label={t("kpiWorse")}
          value={String(counts.worse)}
          delta={counts.worse > 0 ? t("needsAction") : undefined}
          deltaPositive={false}
        />
        <KpiCard label={t("kpiBetter")} value={String(counts.better)} />
      </div>

      <div className="ui-card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">{t("emptyVariations")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((it) => {
              const good = it.severity === "positive";
              const arrow = it.direction === "up" ? "▲" : "▼";
              const deltaColor = good
                ? "text-emerald-600"
                : it.severity === "critical"
                  ? "text-rose-600"
                  : "text-amber-600";
              const verb = it.direction === "up" ? t("rose") : t("fell");
              const metricLabel = tMetrics(METRIC_BY_KEY[it.metric].label);
              return (
                <div
                  key={it.id}
                  className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
                    it.severity === "critical" ? "bg-rose-50/30" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(it.severity)}>
                        {good
                          ? t("severityPositive")
                          : it.severity === "critical"
                            ? t("severityCritical")
                            : t("severityWarning")}
                      </Badge>
                      {it.entityName ? (
                        <span className="text-xs font-medium text-slate-500">{it.entityName}</span>
                      ) : (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {t("levelGeneral")}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm text-slate-800">
                      <span className="font-semibold">{metricLabel}</span> {verb}{" "}
                      <span className={`font-semibold ${deltaColor}`}>
                        {arrow} {Math.abs(it.deltaPct).toFixed(0)}%
                      </span>{" "}
                      <span className="text-slate-400">{t("vsPrevious")}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {t("fromTo", {
                        prev: formatMetricValue(it.metric, it.previousValue, locale),
                        cur: formatMetricValue(it.metric, it.currentValue, locale)
                      })}
                    </div>
                  </div>

                  {it.clientSlug ? (
                    <div className="shrink-0">
                      <Link
                        href={
                          it.metaCampaignId
                            ? `/campaigns/${it.metaCampaignId}?client=${encodeURIComponent(it.clientSlug)}`
                            : `/clients/${it.clientSlug}`
                        }
                        className="ui-btn-secondary text-xs"
                      >
                        {it.metaCampaignId ? t("openCampaign") : t("openClient")}
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
