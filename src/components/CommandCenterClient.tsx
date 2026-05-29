"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { SyncNowButton } from "@/components/SyncNowButton";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";

type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  clientTag: string | null;
  accountLabel: string;
  metaAdAccountId: string;
  spend: number;
  cpl: number | null;
  cpa: number | null;
  roas: number;
  alertCount: number;
  hasAlert: boolean;
};

type AlertRow = {
  id: string;
  title: string;
  message: string;
  clientSlug: string | null;
  metaCampaignId: string | null;
  severity: string;
};

type Summary = {
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
};

type SeriesPoint = { day: string; spend: number; conversions: number; roas: number };

type ViewMode = "campaigns" | "clients" | "accounts";
type AlertFilter = "all" | "critical" | "warning" | "info";
type PeriodDays = 7 | 14 | 30;
type OpenMenu = "date" | "client" | "filters" | null;

type ClientOption = { slug: string; name: string };

function formatPeriodRange(days: PeriodDays, locale: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", year: "numeric" });
  return `${fmt.format(start)} → ${fmt.format(end)}`;
}

function trendFromSeries(values: number[]) {
  if (values.length < 2) return { label: "—", positive: true, pct: 0 };
  const mid = Math.max(1, Math.floor(values.length / 2));
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const next = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
  if (prev === 0) return { label: "—", positive: true, pct: 0 };
  const pct = ((next - prev) / prev) * 100;
  const positive = pct >= 0;
  const arrow = positive ? "↑" : "↓";
  return {
    label: `${arrow} ${Math.abs(pct).toFixed(1).replace(".", ",")}%`,
    positive,
    pct
  };
}

function statusVariant(row: CampaignRow): "success" | "warning" | "danger" | "neutral" {
  if (row.hasAlert && row.alertCount >= 2) return "danger";
  if (row.hasAlert) return "warning";
  return "success";
}

function MetaIcon() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1877F2]/10 text-[10px] font-bold text-[#1877F2]">
      M
    </span>
  );
}

export function CommandCenterClient() {
  const t = useTranslations("command");
  const locale = useLocale();

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ spend: 0, conversions: 0, cpa: 0, roas: 0 });
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("campaigns");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [clientFilter, setClientFilter] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const pageSize = 10;

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (clientFilter) qs.set("clientId", clientFilter);
    if (onlyAlerts) qs.set("onlyAlerts", "1");
    qs.set("days", String(periodDays));

    const dashQs = new URLSearchParams();
    dashQs.set("days", String(periodDays));
    if (clientFilter) dashQs.set("clientId", clientFilter);

    fetch(`/api/command-center/campaigns?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        setRows(j.rows ?? []);
        setTotal(j.total ?? j.rows?.length ?? 0);
      });
    fetch("/api/command-center/alerts?limit=50")
      .then((r) => r.json())
      .then((j) => setAlerts(j.alerts ?? []));
    fetch(`/api/dashboard/summary?${dashQs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.summary) setSummary(j.summary);
      });
    fetch(`/api/dashboard/timeseries?${dashQs}`)
      .then((r) => r.json())
      .then((j) => setSeries(j.series ?? []));
  }, [q, clientFilter, onlyAlerts, periodDays]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tmr = setTimeout(() => setQ(searchInput), 300);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as Array<{ name: string; slug?: string }>;
        setClients(
          list.map((c) => ({
            name: c.name,
            slug: c.slug ?? c.name.toLowerCase().replace(/\s+/g, "-")
          }))
        );
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!filterBarRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const periodLabel = formatPeriodRange(periodDays, locale);
  const clientLabel =
    clientFilter === ""
      ? t("allClients")
      : clients.find((c) => c.slug === clientFilter)?.name ?? t("allClients");
  const filtersActive = onlyAlerts;

  const spendSeries = series.map((s) => s.spend);
  const convSeries = series.map((s) => s.conversions);
  const cpaSeries = series.map((s) => (s.conversions > 0 ? s.spend / s.conversions : 0));
  const roasSeries = series.map((s) => s.roas);

  const clientsWithAlerts = useMemo(
    () => new Set(rows.filter((r) => r.hasAlert).map((r) => r.clientSlug)).size,
    [rows]
  );
  const totalClients = useMemo(() => new Set(rows.map((r) => r.clientSlug)).size, [rows]);
  const alertPct = totalClients > 0 ? (clientsWithAlerts / totalClients) * 100 : 0;

  const filteredAlerts = useMemo(() => {
    if (alertFilter === "all") return alerts;
    if (alertFilter === "critical") return alerts.filter((a) => a.severity === "critical");
    if (alertFilter === "warning") return alerts.filter((a) => a.severity === "warning");
    return alerts.filter((a) => a.severity !== "critical" && a.severity !== "warning");
  }, [alerts, alertFilter]);

  const alertCounts = useMemo(
    () => ({
      all: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity !== "critical" && a.severity !== "warning").length
    }),
    [alerts]
  );

  const clientRows = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; slug: string; tag: string | null; spend: number; cpl: number | null; cpa: number | null; roas: number; alertCount: number; campaigns: number }
    >();
    for (const r of rows) {
      const cur = map.get(r.clientSlug) ?? {
        key: r.clientSlug,
        name: r.clientName,
        slug: r.clientSlug,
        tag: r.clientTag,
        spend: 0,
        cpl: null,
        cpa: null,
        roas: 0,
        alertCount: 0,
        campaigns: 0
      };
      cur.spend += r.spend;
      cur.campaigns += 1;
      cur.alertCount += r.alertCount;
      if (r.cpa != null) cur.cpa = r.cpa;
      if (r.cpl != null) cur.cpl = r.cpl;
      cur.roas = r.roas;
      map.set(r.clientSlug, cur);
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const accountRows = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; metaId: string; spend: number; cpl: number | null; cpa: number | null; roas: number; alertCount: number; campaigns: number }
    >();
    for (const r of rows) {
      const key = r.metaAdAccountId || r.accountLabel;
      const cur = map.get(key) ?? {
        key,
        label: r.accountLabel,
        metaId: r.metaAdAccountId,
        spend: 0,
        cpl: null,
        cpa: null,
        roas: 0,
        alertCount: 0,
        campaigns: 0
      };
      cur.spend += r.spend;
      cur.campaigns += 1;
      cur.alertCount += r.alertCount;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const tableRows = viewMode === "clients" ? clientRows : viewMode === "accounts" ? accountRows : rows;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const pagedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const campaignSelectedIds =
    viewMode === "campaigns"
      ? selectedIds
      : rows.filter((r) => selectedIds.includes(r.clientSlug) || selectedIds.includes(r.metaAdAccountId)).map((r) => r.metaCampaignId);

  const allSelected =
    pagedRows.length > 0 &&
    pagedRows.every((r) => selected[(r as CampaignRow).metaCampaignId ?? (r as { key: string }).key]);

  function rowKey(r: (typeof tableRows)[number]) {
    if ("metaCampaignId" in r) return r.metaCampaignId;
    return (r as { key: string }).key;
  }

  function bulkAction(action: "pause" | "budget_delta_percent", deltaPercent?: number) {
    if (!campaignSelectedIds.length) return;
    startTransition(async () => {
      const res = await fetch("/api/command-center/bulk-actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, metaCampaignIds: campaignSelectedIds, deltaPercent })
      });
      const j = await res.json();
      setMessage(j.ok ? t("bulkDone", { count: campaignSelectedIds.length }) : j.error);
      load();
    });
  }

  const shortcuts = [
    { label: t("shortcutNewCampaign"), href: "/campaigns?publish=1", color: "bg-violet-50 text-violet-600" },
    { label: t("shortcutAudience"), href: "/audiences", color: "bg-emerald-50 text-emerald-600" },
    { label: t("shortcutLookalike"), href: "/audiences", color: "bg-amber-50 text-amber-600" },
    { label: t("shortcutReport"), href: "/reports", color: "bg-pink-50 text-pink-600" },
    { label: t("shortcutAutomation"), href: "/automations", color: "bg-indigo-50 text-indigo-600" },
    { label: t("shortcutCreatives"), href: "/clients", color: "bg-orange-50 text-orange-600" },
    { label: t("shortcutSync"), href: "#", color: "bg-slate-100 text-slate-600", onClick: true }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            <span className="sr-only">Dark mode</span>🌙
          </button>
          <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            🔔
            {alerts.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {alerts.length > 9 ? "9+" : alerts.length}
              </span>
            ) : null}
          </button>
          <SyncNowButton />
          <Link href="/campaigns?publish=1" className="ui-btn-primary whitespace-nowrap">
            {t("newCampaign")}
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div ref={filterBarRef} className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "date" ? null : "date"))}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            aria-expanded={openMenu === "date"}
          >
            <span className="text-slate-400">📅</span>
            <span>{periodLabel}</span>
            <span className="text-slate-400">▾</span>
          </button>
          {openMenu === "date" ? (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {([7, 14, 30] as PeriodDays[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setPeriodDays(d);
                    setPage(1);
                    setOpenMenu(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    periodDays === d ? "font-semibold text-violet-700" : "text-slate-700"
                  }`}
                >
                  {t(`period${d}` as "period7")}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "client" ? null : "client"))}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            aria-expanded={openMenu === "client"}
          >
            <span>{clientLabel}</span>
            <span className="text-slate-400">▾</span>
          </button>
          {openMenu === "client" ? (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setClientFilter("");
                  setPage(1);
                  setOpenMenu(null);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  !clientFilter ? "font-semibold text-violet-700" : "text-slate-700"
                }`}
              >
                {t("allClients")}
              </button>
              {clients.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    setClientFilter(c.slug);
                    setPage(1);
                    setOpenMenu(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    clientFilter === c.slug ? "font-semibold text-violet-700" : "text-slate-700"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "filters" ? null : "filters"))}
            className={`ui-btn-secondary text-sm ${filtersActive ? "border-violet-300 bg-violet-50 text-violet-800" : ""}`}
            aria-expanded={openMenu === "filters"}
          >
            {t("filters")}
            {filtersActive ? " · 1" : ""}
          </button>
          {openMenu === "filters" ? (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="text-xs font-semibold text-slate-700">{t("filterPanelTitle")}</div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyAlerts}
                  onChange={(e) => {
                    setOnlyAlerts(e.target.checked);
                    setPage(1);
                  }}
                  className="accent-violet-600"
                />
                {t("filterOnlyAlerts")}
              </label>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyAlerts(false);
                    setPage(1);
                    setOpenMenu(null);
                  }}
                  className="mt-3 text-xs font-medium text-violet-600 underline"
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-w-[220px] flex-1">
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchCampaign")}
            className="ui-input w-full shadow-sm"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label={t("kpiSpend")}
          value={formatBRL(summary.spend, locale)}
          delta={`${trendFromSeries(spendSeries).label} ${t("vsPrevious")}`}
          deltaPositive={trendFromSeries(spendSeries).positive}
          sparkline={spendSeries.length ? spendSeries : [0, 0]}
          sparkColor="#7c3aed"
          icon={<span>💜</span>}
        />
        <KpiCard
          label={t("kpiConversions")}
          value={formatNumber(summary.conversions, locale)}
          delta={`${trendFromSeries(convSeries).label} ${t("vsPrevious")}`}
          deltaPositive={trendFromSeries(convSeries).positive}
          sparkline={convSeries.length ? convSeries : [0, 0]}
          sparkColor="#3b82f6"
          icon={<span>📈</span>}
        />
        <KpiCard
          label={t("kpiCpa")}
          value={formatBRL(summary.cpa, locale)}
          delta={`${trendFromSeries(cpaSeries).label} ${t("vsPrevious")}`}
          deltaPositive={!trendFromSeries(cpaSeries).positive}
          sparkline={cpaSeries.length ? cpaSeries : [0, 0]}
          sparkColor="#10b981"
          icon={<span>💚</span>}
        />
        <KpiCard
          label={t("kpiRoas")}
          value={formatRoas(summary.roas, locale)}
          delta={`${trendFromSeries(roasSeries).label} ${t("vsPrevious")}`}
          deltaPositive={trendFromSeries(roasSeries).positive}
          sparkline={roasSeries.length ? roasSeries : [0, 0]}
          sparkColor="#f59e0b"
          icon={<span>🔶</span>}
        />
        <KpiCard
          label={t("kpiClientsAlert")}
          value={String(clientsWithAlerts)}
          footer={
            <>
              <div className="mt-1 text-xs text-slate-500">
                {formatPercent(alertPct, 1, locale)} {t("kpiClientsAlertHint")}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${Math.min(100, alertPct)}%` }}
                />
              </div>
            </>
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* View tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 pt-3">
            {(
              [
                ["campaigns", t("viewCampaigns")],
                ["clients", t("viewClients")],
                ["accounts", t("viewAccounts")]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setViewMode(key);
                  setPage(1);
                  setSelected({});
                }}
                className={`border-b-2 px-3 pb-2.5 text-sm font-medium transition ${
                  viewMode === key
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              disabled={isPending || !campaignSelectedIds.length}
              onClick={() => bulkAction("pause")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {t("bulkPause")}
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              {t("bulkActivate")}
            </button>
            <button
              type="button"
              disabled={isPending || !campaignSelectedIds.length}
              onClick={() => bulkAction("budget_delta_percent", -10)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {t("bulkBudgetDown")}
            </button>
            <button
              type="button"
              disabled={isPending || !campaignSelectedIds.length}
              onClick={() => bulkAction("budget_delta_percent", 10)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {t("bulkBudgetUp")}
            </button>
            <button type="button" className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-violet-600">
              {t("saveView")}
            </button>
            {message ? <span className="text-xs text-slate-500">{message}</span> : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        if (e.target.checked) {
                          for (const r of pagedRows) next[rowKey(r)] = true;
                        }
                        setSelected(next);
                      }}
                      className="accent-violet-600"
                    />
                  </th>
                  <th className="px-3 py-3">
                    {viewMode === "campaigns"
                      ? t("colCampaign")
                      : viewMode === "clients"
                        ? t("colClient")
                        : t("colAccount")}
                  </th>
                  {viewMode === "campaigns" ? (
                    <>
                      <th className="px-3 py-3">{t("colClient")}</th>
                      <th className="px-3 py-3">{t("colAccount")}</th>
                    </>
                  ) : null}
                  <th className="px-3 py-3">{t("colSpend")}</th>
                  {viewMode === "campaigns" ? <th className="px-3 py-3">CPL</th> : null}
                  <th className="px-3 py-3">CPA</th>
                  <th className="px-3 py-3">ROAS</th>
                  <th className="px-3 py-3">{t("colStatus")}</th>
                  <th className="px-3 py-3">{t("colAlerts")}</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {viewMode === "campaigns"
                  ? (pagedRows as CampaignRow[]).map((r) => (
                      <tr key={r.metaCampaignId} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected[r.metaCampaignId]}
                            onChange={(e) =>
                              setSelected((p) => ({ ...p, [r.metaCampaignId]: e.target.checked }))
                            }
                            className="accent-violet-600"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <MetaIcon />
                            <Link
                              href={`/campaigns/${r.metaCampaignId}?client=${encodeURIComponent(r.clientSlug)}`}
                              className="font-medium text-slate-900 hover:text-violet-600"
                            >
                              {r.campaignName}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-800">{r.clientName}</div>
                          {r.clientTag ? (
                            <span className="mt-0.5 inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                              {r.clientTag}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{r.accountLabel}</td>
                        <td className="px-3 py-3 font-medium">{formatBRL(r.spend, locale)}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {r.cpl != null ? formatBRL(r.cpl, locale) : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatRoas(r.roas, locale)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={statusVariant(r)}>
                            {r.hasAlert
                              ? r.alertCount >= 2
                                ? t("statusCritical")
                                : t("statusAttention")
                              : t("statusActive")}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {r.alertCount > 0 ? (
                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                              {r.alertCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-400">⋮</td>
                      </tr>
                    ))
                  : (pagedRows as Array<{
                      key: string;
                      name?: string;
                      label?: string;
                      slug?: string;
                      spend: number;
                      cpa: number | null;
                      roas: number;
                      alertCount: number;
                    }>).map((r) => (
                      <tr key={r.key} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected[r.key]}
                            onChange={(e) => setSelected((p) => ({ ...p, [r.key]: e.target.checked }))}
                            className="accent-violet-600"
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {r.slug ? (
                            <Link href={`/clients/${r.slug}`} className="hover:text-violet-600">
                              {r.name}
                            </Link>
                          ) : (
                            (r.name ?? r.label)
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium">{formatBRL(r.spend, locale)}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatRoas(r.roas, locale)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={r.alertCount > 0 ? "warning" : "success"}>
                            {r.alertCount > 0 ? t("statusAttention") : t("statusActive")}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {r.alertCount > 0 ? (
                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                              {r.alertCount}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-400">⋮</td>
                      </tr>
                    ))}
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-500">
                      {t("empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              {t("pagination", {
                from: tableRows.length ? (page - 1) * pageSize + 1 : 0,
                to: Math.min(page * pageSize, tableRows.length),
                total: viewMode === "campaigns" ? total : tableRows.length
              })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[28px] rounded-lg px-2 py-1 ${
                    page === n ? "bg-violet-600 text-white" : "border border-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{t("inbox")}</h2>
              <Link href="/alerts" className="text-xs text-violet-600 hover:underline">
                {t("viewAll")}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(
                [
                  ["all", t("alertTabAll", { count: alertCounts.all })],
                  ["critical", t("alertTabCritical", { count: alertCounts.critical })],
                  ["warning", t("alertTabWarning", { count: alertCounts.warning })],
                  ["info", t("alertTabInfo", { count: alertCounts.info })]
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAlertFilter(key)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                    alertFilter === key ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto">
              {filteredAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    a.severity === "critical"
                      ? "border-red-100 bg-red-50/50"
                      : a.severity === "warning"
                        ? "border-amber-100 bg-amber-50/50"
                        : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div className="flex gap-2">
                    <span>{a.severity === "critical" ? "🔺" : a.severity === "warning" ? "⚠️" : "ℹ️"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900">{a.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{a.message}</div>
                      {a.clientSlug && a.metaCampaignId ? (
                        <Link
                          href={`/campaigns/${a.metaCampaignId}?client=${encodeURIComponent(a.clientSlug)}`}
                          className="mt-1 inline-block text-[11px] font-medium text-violet-600"
                        >
                          {t("open")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAlerts.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">{t("inboxEmpty")}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">{t("shortcuts")}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {shortcuts.map((s) =>
                s.onClick ? (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => load()}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center text-[10px] font-medium leading-tight ${s.color} hover:opacity-90`}
                  >
                    <span className="text-base">🔄</span>
                    {s.label}
                  </button>
                ) : (
                  <Link
                    key={s.label}
                    href={s.href as "/command"}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center text-[10px] font-medium leading-tight ${s.color} hover:opacity-90`}
                  >
                    <span className="text-base">+</span>
                    {s.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
