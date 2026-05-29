"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function queryString(clientId: string, adAccountId: string) {
  const p = new URLSearchParams();
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
      const qs = queryString(clientFilter, accountFilter);
      const [sRes, tRes, aRes, cRes, critRes] = await Promise.all([
        fetch(`/api/dashboard/summary${qs}`),
        fetch(`/api/dashboard/timeseries${qs}`),
        fetch("/api/alerts?limit=10"),
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

  const chartData = series.map((p) => ({
    ...p,
    label: p.day.slice(5)
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setAccountFilter("");
            }}
            className="mt-1 rounded-xl ui-input"
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
            className="mt-1 rounded-xl ui-input"
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
        <section className="rounded-2xl border-2 border-rose-800/80 bg-rose-950/30 p-4">
          <div className="text-sm font-semibold text-rose-200">{t("attentionTitle")}</div>
          <div className="mt-1 text-xs text-rose-300/80">{t("attentionSubtitle")}</div>
          <div className="mt-3 space-y-2">
            {criticalAlerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-rose-900/50 bg-white/80 p-3"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-100">{a.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{a.description}</div>
                </div>
                {a.clientId ? (
                  <Link
                    href={`/clients/${clients.find((c) => c.id === a.clientId)?.slug ?? ""}`}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300"
                  >
                    {t("viewClient")}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {note ? (
        <div className="rounded-xl border border-violet-900/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
          {note}
        </div>
      ) : null}

      {loading || !summary ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">
          {t("loadingMetrics")}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label={t("totalSpend")} value={formatBRL(summary.spend, locale)} />
            <StatCard label={t("impressions")} value={formatNumber(summary.impressions, locale)} />
            <StatCard label={t("ctr")} value={formatPercent(summary.ctr, 1, locale)} />
            <StatCard label={t("avgCpc")} value={formatBRL(summary.cpc, locale)} />
            <StatCard label={t("conversions")} value={formatNumber(summary.conversions, locale)} />
            <StatCard label={t("roas")} value={formatRoas(summary.roas, locale)} />
          </section>

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
                      <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#09090b",
                          border: "1px solid #27272a",
                          borderRadius: 12
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="spend"
                        name={t("chartSpend")}
                        stroke="#8b5cf6"
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversions"
                        name={t("chartConversions")}
                        stroke="#10b981"
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
                          ? "border-rose-900/60 bg-red-50/50"
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

          <section className="ui-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t("clientsTitle")}</div>
                <div className="text-xs text-slate-500">{t("clientsSubtitle")}</div>
              </div>
              <Link href="/clients" className="text-xs font-semibold text-violet-400 hover:text-violet-300">
                {t("viewAllClients")}
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.slug}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-violet-700/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{c.name}</div>
                    {(c.alertCount ?? 0) > 0 ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {c.alertCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{t("roas")}</div>
                  <div className="text-lg font-semibold text-emerald-400">
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
