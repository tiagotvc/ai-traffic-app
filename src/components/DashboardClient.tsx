"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Link } from "@/i18n/navigation";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";

type Summary = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  cpa?: number;
};

type SeriesPoint = { day: string; spend: number; conversions: number; roas: number };
type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity?: string;
  clientId?: string | null;
  metaCampaignId?: string | null;
};
type ClientCard = { id: string; slug: string; name: string; roas: number; alertCount?: number };
type AdAccountOpt = { id: string; metaAdAccountId: string; label: string };

function sumBy(rows: SeriesPoint[], key: "spend" | "conversions") {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

function avgRoas(rows: SeriesPoint[]) {
  const valid = rows.filter((r) => Number(r.roas) > 0);
  if (!valid.length) return 0;
  return valid.reduce((acc, r) => acc + Number(r.roas), 0) / valid.length;
}

function pctDelta(cur: number, prev: number): number | null {
  if (!prev || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DeltaBadge({
  delta,
  goodWhen,
  locale,
  noPrevLabel
}: {
  delta: number | null;
  goodWhen: "up" | "neutral";
  locale: string;
  noPrevLabel: string;
}) {
  if (delta === null) {
    return <span className="text-[11px] text-slate-400">{noPrevLabel}</span>;
  }
  const up = delta >= 0;
  const color =
    goodWhen === "neutral"
      ? "bg-violet-50 text-violet-700"
      : up === (goodWhen === "up")
        ? "bg-emerald-50 text-emerald-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      <span className="leading-none">{up ? "▲" : "▼"}</span>
      {formatPercent(Math.abs(delta), 1, locale)}
    </span>
  );
}

function HighlightCard({
  id,
  label,
  value,
  delta,
  goodWhen,
  data,
  dataKey,
  color,
  vsLabel,
  noPrevLabel,
  locale
}: {
  id: string;
  label: string;
  value: string;
  delta: number | null;
  goodWhen: "up" | "neutral";
  data: Array<{ label: string } & Record<string, number | string>>;
  dataKey: string;
  color: string;
  vsLabel: string;
  noPrevLabel: string;
  locale: string;
}) {
  return (
    <div className="ui-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <DeltaBadge delta={delta} goodWhen={goodWhen} locale={locale} noPrevLabel={noPrevLabel} />
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{vsLabel}</div>
      <div className="mt-3 h-16">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 11
                }}
                labelStyle={{ color: "#64748b" }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

function SupportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function queryString(clientId: string, adAccountId: string, extra?: Record<string, string>) {
  const p = new URLSearchParams(extra);
  if (clientId) p.set("clientId", clientId);
  if (adAccountId) p.set("adAccountId", adAccountId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function DashboardClient() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([]);
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccountOpt[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sQs = queryString(clientFilter, accountFilter, { days: "30" });
      const tQs = queryString(clientFilter, accountFilter, { days: "60" });
      const [sRes, tRes, aRes, cRes, critRes] = await Promise.all([
        fetch(`/api/dashboard/summary${sQs}`),
        fetch(`/api/dashboard/timeseries${tQs}`),
        fetch("/api/alerts?limit=8"),
        fetch("/api/clients"),
        fetch("/api/alerts?severity=critical&limit=8")
      ]);

      const sJson = await sRes.json();
      const tJson = await tRes.json();
      const aJson = await aRes.json();
      const cJson = await cRes.json();
      const critJson = await critRes.json();

      setSummary(sJson.summary);
      setSeries(tJson.series ?? []);
      setAlerts(aJson.alerts ?? []);
      setCriticalAlerts(critJson.alerts ?? []);
      setClients(cJson.clients ?? []);
      setAdAccounts(sJson.adAccounts ?? []);
      setNote(null);
    } catch {
      setNote(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [clientFilter, accountFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSync = () => void load();
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load]);

  const insights = useMemo(() => {
    const last30 = series.slice(-30);
    const prev30 = series.slice(-60, -30);
    const spendCur = sumBy(last30, "spend");
    const convCur = sumBy(last30, "conversions");
    const roasCur = avgRoas(last30);
    const spark = last30.map((p) => ({ label: p.day.slice(5), spend: p.spend, conversions: p.conversions, roas: p.roas }));
    return {
      spark,
      spend: { cur: spendCur, delta: pctDelta(spendCur, sumBy(prev30, "spend")) },
      conversions: { cur: convCur, delta: pctDelta(convCur, sumBy(prev30, "conversions")) },
      roas: { cur: roasCur, delta: pctDelta(roasCur, avgRoas(prev30)) }
    };
  }, [series]);

  const chartData = series.slice(-30).map((p) => ({ ...p, label: p.day.slice(5) }));
  const vsLabel = t("vsPrevPeriod");
  const noPrev = t("noPrevData");

  return (
    <div className="space-y-4">
      {/* Highlights header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("highlights")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("highlightsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {t("currencyLabel")}: BRL
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {t("last30Days")}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setAccountFilter("");
            }}
            className="mt-1 ui-select"
          >
            <option value="">{t("filterAllClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterAccount")}</div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="mt-1 ui-select"
          >
            <option value="">{t("filterAllAccounts")}</option>
            {adAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {criticalAlerts.length > 0 ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">{t("attentionTitle")}</div>
          <div className="mt-1 text-xs text-rose-600/80">{t("attentionSubtitle")}</div>
          <div className="mt-3 space-y-2">
            {criticalAlerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-rose-200 bg-white p-3"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-700">{a.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{a.description}</div>
                </div>
                {a.clientId ? (
                  <Link
                    href={`/clients/${clients.find((c) => c.id === a.clientId)?.slug ?? ""}`}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-500"
                  >
                    {t("viewClient")}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {note ? <div className="ui-alert-info">{note}</div> : null}

      {loading || !summary ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loadingMetrics")}</div>
      ) : (
        <>
          {/* Hero highlight cards */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <HighlightCard
              id="spend"
              label={t("totalSpend")}
              value={formatBRL(insights.spend.cur, locale)}
              delta={insights.spend.delta}
              goodWhen="neutral"
              data={insights.spark}
              dataKey="spend"
              color="#7c3aed"
              vsLabel={vsLabel}
              noPrevLabel={noPrev}
              locale={locale}
            />
            <HighlightCard
              id="conv"
              label={t("conversions")}
              value={formatNumber(insights.conversions.cur, locale)}
              delta={insights.conversions.delta}
              goodWhen="up"
              data={insights.spark}
              dataKey="conversions"
              color="#10b981"
              vsLabel={vsLabel}
              noPrevLabel={noPrev}
              locale={locale}
            />
            <HighlightCard
              id="roas"
              label={t("roas")}
              value={formatRoas(insights.roas.cur, locale)}
              delta={insights.roas.delta}
              goodWhen="up"
              data={insights.spark}
              dataKey="roas"
              color="#0ea5e9"
              vsLabel={vsLabel}
              noPrevLabel={noPrev}
              locale={locale}
            />
          </section>

          {/* Supporting metrics strip */}
          <section className="ui-card">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("supportingTitle")}
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-5">
              <SupportStat label={t("impressions")} value={formatNumber(summary.impressions, locale)} />
              <SupportStat label={t("clicks")} value={formatNumber(summary.clicks, locale)} />
              <SupportStat label={t("ctr")} value={formatPercent(summary.ctr, 1, locale)} />
              <SupportStat label={t("avgCpc")} value={formatBRL(summary.cpc, locale)} />
              <SupportStat
                label={t("cpa")}
                value={summary.cpa && summary.cpa > 0 ? formatBRL(summary.cpa, locale) : "—"}
              />
            </div>
          </section>

          {/* Performance chart + alerts */}
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2 ui-card p-4">
              <div>
                <div className="text-sm font-semibold">{t("performance")}</div>
                <div className="text-xs text-slate-500">{t("last30Days")}</div>
              </div>
              <div className="mt-4 h-56">
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          fontSize: 12
                        }}
                        labelStyle={{ color: "#64748b" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="spend"
                        name={t("chartSpend")}
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversions"
                        name={t("chartConversions")}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    {t("noChartData")}
                  </div>
                )}
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="text-sm font-semibold">{t("alertsTitle")}</div>
              <div className="mt-3 space-y-2">
                {alerts.length ? (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-3 ${
                        a.severity === "critical"
                          ? "border-rose-200 bg-rose-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-700">{a.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{a.description}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500">{t("noAlerts")}</div>
                )}
              </div>
            </div>
          </section>

          {/* Clients */}
          <section className="ui-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t("clientsTitle")}</div>
                <div className="text-xs text-slate-500">{t("clientsSubtitle")}</div>
              </div>
              <Link
                href="/clients"
                className="text-xs font-semibold text-violet-600 hover:text-violet-500"
              >
                {t("viewAllClients")}
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.slug}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                    {(c.alertCount ?? 0) > 0 ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {c.alertCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{t("roas")}</div>
                  <div className="text-lg font-semibold text-emerald-600">
                    {c.roas > 0 ? formatRoas(c.roas, locale) : "—"}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
