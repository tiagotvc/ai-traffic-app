"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { ClientGoogleAdPreviewModal } from "@/components/ClientGoogleAdPreviewModal";
import { SortableTh, type SortDir } from "@/components/campaigns/googleTableSort";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

/** Ordena um nível do drill-down (campanhas, grupos ou anúncios) pela chave/direção compartilhada. */
function sortLevel<T extends Record<string, unknown>>(arr: T[], key: string, dir: SortDir): T[] {
  const out = [...arr];
  out.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const c =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
    return dir === "asc" ? c : -c;
  });
  return out;
}

type Metricish = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

type CampaignRow = Metricish & {
  campaignId: string;
  name: string;
  status: string;
  channelType: string;
};
type AdGroupRow = Metricish & { id: string; name: string; status: string };
type AdRow = AdGroupRow & { type: string };

type Loadable<T> = "loading" | "error" | T[];

const DAY_OPTIONS = [7, 30, 90] as const;

function statusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}

export function ClientGoogleAdsPanel({
  clientId,
  showSyncButton = true
}: {
  clientId: string;
  /** false quando o sync é feito por um botão externo (ex.: sync contextual do hub). */
  showSyncButton?: boolean;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [syncing, startSync] = useTransition();

  // Estado de expansão da hierarquia.
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  const [openAdGroups, setOpenAdGroups] = useState<Set<string>>(new Set());
  const [adGroups, setAdGroups] = useState<Record<string, Loadable<AdGroupRow>>>({});
  const [ads, setAds] = useState<Record<string, Loadable<AdRow>>>({});
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    setOpenCampaigns(new Set());
    setOpenAdGroups(new Set());
    setAdGroups({});
    setAds({});
    return fetch(`${base}/metrics?days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.campaigns ?? []);
        else setError(j.error ?? "error");
      })
      .catch(() => setError("error"));
  }, [base, days]);

  useEffect(() => {
    void load();
  }, [load]);

  // Recarrega quando um sync externo (ex.: botão contextual do hub) termina.
  useEffect(() => {
    const onSync = () => void load();
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load]);

  function sync() {
    startSync(async () => {
      await fetch(`${base}/sync?days=${days}`, { method: "POST" }).catch(() => undefined);
      await load();
    });
  }

  function toggleCampaign(campaignId: string) {
    setOpenCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
    if (!adGroups[campaignId]) {
      setAdGroups((prev) => ({ ...prev, [campaignId]: "loading" }));
      fetch(`${base}/adgroups?campaignId=${campaignId}&days=${days}`)
        .then((r) => r.json())
        .then((j) =>
          setAdGroups((prev) => ({ ...prev, [campaignId]: j.ok ? j.rows ?? [] : "error" }))
        )
        .catch(() => setAdGroups((prev) => ({ ...prev, [campaignId]: "error" })));
    }
  }

  function toggleAdGroup(adGroupId: string) {
    setOpenAdGroups((prev) => {
      const next = new Set(prev);
      if (next.has(adGroupId)) next.delete(adGroupId);
      else next.add(adGroupId);
      return next;
    });
    if (!ads[adGroupId]) {
      setAds((prev) => ({ ...prev, [adGroupId]: "loading" }));
      fetch(`${base}/ads?adGroupId=${adGroupId}&days=${days}`)
        .then((r) => r.json())
        .then((j) => setAds((prev) => ({ ...prev, [adGroupId]: j.ok ? j.rows ?? [] : "error" })))
        .catch(() => setAds((prev) => ({ ...prev, [adGroupId]: "error" })));
    }
  }

  function MetricCells({ m }: { m: Metricish }) {
    return (
      <>
        <td className="py-2 pr-3 text-right">{formatNumber(m.impressions, locale)}</td>
        <td className="py-2 pr-3 text-right">{formatNumber(m.clicks, locale)}</td>
        <td className="py-2 pr-3 text-right">{formatBRL(m.cost, locale)}</td>
        <td className="py-2 pr-3 text-right">{formatNumber(m.conversions, locale)}</td>
        <td className="py-2 pr-3 text-right">{formatPercent(m.ctr * 100, 2, locale)}</td>
        <td className="py-2 text-right">{formatBRL(m.averageCpc, locale)}</td>
      </>
    );
  }

  function SubStateRow({ colSpan, text }: { colSpan: number; text: string }) {
    return (
      <tr className="border-t border-[var(--border-color)]">
        <td colSpan={colSpan} className="py-2 pl-10 text-[var(--text-dimmer)]">
          {text}
        </td>
      </tr>
    );
  }

  const COLS = 9;

  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#EA4335"
              d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
            />
          </svg>
          <div className="text-sm font-semibold">{t("googleAdsPanelTitle")}</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as (typeof DAY_OPTIONS)[number])}
            className="rounded-xl ui-input text-xs"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t("googleAdsDays", { days: d })}
              </option>
            ))}
          </select>
          {showSyncButton ? (
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {syncing ? t("googleAdsSyncing") : t("googleAdsSync")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        {rows === null && !error ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-xs text-[var(--text-dim)]">
            {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
          </div>
        ) : rows && rows.length === 0 ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleAdsSyncHint")}</div>
        ) : (
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <SortableTh label={t("googleAdsColCampaign")} sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-3">{t("googleAdsColStatus")}</th>
                <th className="py-2 pr-3">{t("googleAdsColChannel")}</th>
                <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {sortLevel(rows ?? [], sortKey, sortDir).map((row) => {
                const open = openCampaigns.has(row.campaignId);
                const groups = adGroups[row.campaignId];
                return (
                  <Fragment key={row.campaignId}>
                    <tr className="border-t border-[var(--border-color)]">
                      <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                        <button
                          type="button"
                          onClick={() => toggleCampaign(row.campaignId)}
                          className="inline-flex items-center gap-1 text-left hover:text-[var(--ui-accent)]"
                        >
                          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <span>{row.name}</span>
                        </button>
                      </td>
                      <td className={`py-2 pr-3 font-semibold ${statusColor(row.status)}`}>
                        {row.status}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-dim)]">{row.channelType}</td>
                      <MetricCells m={row} />
                    </tr>

                    {open && groups === "loading" ? (
                      <SubStateRow key={`${row.campaignId}-l`} colSpan={COLS} text={t("loadingShort")} />
                    ) : null}
                    {open && groups === "error" ? (
                      <SubStateRow key={`${row.campaignId}-e`} colSpan={COLS} text={t("googleAdsLoadError")} />
                    ) : null}
                    {open && Array.isArray(groups) && groups.length === 0 ? (
                      <SubStateRow key={`${row.campaignId}-0`} colSpan={COLS} text={t("googleNoAdGroups")} />
                    ) : null}
                    {open && Array.isArray(groups)
                      ? sortLevel(groups, sortKey, sortDir).map((g) => {
                          const gOpen = openAdGroups.has(g.id);
                          const groupAds = ads[g.id];
                          return (
                            <Fragment key={g.id}>
                              <tr className="border-t border-[var(--border-color)] bg-[var(--surface-thead)]/30">
                                <td className="py-2 pr-3 text-[var(--text-main)]">
                                  <button
                                    type="button"
                                    onClick={() => toggleAdGroup(g.id)}
                                    className="ml-5 inline-flex items-center gap-1 text-left hover:text-[var(--ui-accent)]"
                                  >
                                    {gOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    <span>{g.name}</span>
                                  </button>
                                </td>
                                <td className={`py-2 pr-3 ${statusColor(g.status)}`}>{g.status}</td>
                                <td className="py-2 pr-3 text-[var(--text-dimmer)]">
                                  {t("googleLevelAdGroup")}
                                </td>
                                <MetricCells m={g} />
                              </tr>

                              {gOpen && groupAds === "loading" ? (
                                <SubStateRow key={`${g.id}-l`} colSpan={COLS} text={t("loadingShort")} />
                              ) : null}
                              {gOpen && groupAds === "error" ? (
                                <SubStateRow key={`${g.id}-e`} colSpan={COLS} text={t("googleAdsLoadError")} />
                              ) : null}
                              {gOpen && Array.isArray(groupAds) && groupAds.length === 0 ? (
                                <SubStateRow key={`${g.id}-0`} colSpan={COLS} text={t("googleNoAds")} />
                              ) : null}
                              {gOpen && Array.isArray(groupAds)
                                ? sortLevel(groupAds, sortKey, sortDir).map((a) => (
                                    <tr key={a.id} className="border-t border-[var(--border-color)]">
                                      <td className="py-2 pr-3 text-[var(--text-dim)]">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedAdId(a.id)}
                                          className="ml-10 text-left hover:text-[var(--ui-accent)] hover:underline"
                                        >
                                          {a.name || `#${a.id}`}
                                        </button>
                                      </td>
                                      <td className={`py-2 pr-3 ${statusColor(a.status)}`}>
                                        {a.status}
                                      </td>
                                      <td className="py-2 pr-3 text-[var(--text-dimmer)]">
                                        {a.type}
                                      </td>
                                      <MetricCells m={a} />
                                    </tr>
                                  ))
                                : null}
                            </Fragment>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ClientGoogleAdPreviewModal
        clientId={clientId}
        adId={selectedAdId}
        days={days}
        onClose={() => setSelectedAdId(null)}
      />
    </div>
  );
}
