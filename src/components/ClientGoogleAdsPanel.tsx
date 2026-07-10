"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

type GoogleCampaignRow = {
  campaignId: string;
  name: string;
  status: string;
  channelType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  averageCpc: number;
};

const DAY_OPTIONS = [7, 30, 90] as const;

function statusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}

export function ClientGoogleAdsPanel({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [rows, setRows] = useState<GoogleCampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [syncing, startSync] = useTransition();

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    return fetch(`/api/clients/${encodeURIComponent(clientId)}/google-ads/metrics?days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.campaigns ?? []);
        else setError(j.error ?? "error");
      })
      .catch(() => setError("error"));
  }, [clientId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  function sync() {
    startSync(async () => {
      await fetch(`/api/clients/${encodeURIComponent(clientId)}/google-ads/sync?days=${days}`, {
        method: "POST"
      }).catch(() => undefined);
      await load();
    });
  }

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
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {syncing ? t("googleAdsSyncing") : t("googleAdsSync")}
          </button>
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
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="py-2 pr-3">{t("googleAdsColCampaign")}</th>
                <th className="py-2 pr-3">{t("googleAdsColStatus")}</th>
                <th className="py-2 pr-3">{t("googleAdsColChannel")}</th>
                <th className="py-2 pr-3 text-right">{tMetrics("impressions")}</th>
                <th className="py-2 pr-3 text-right">{tMetrics("clicks")}</th>
                <th className="py-2 pr-3 text-right">{tMetrics("spend")}</th>
                <th className="py-2 pr-3 text-right">{tMetrics("conversions")}</th>
                <th className="py-2 pr-3 text-right">{tMetrics("ctr")}</th>
                <th className="py-2 text-right">{tMetrics("cpc")}</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.campaignId} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">{row.name}</td>
                  <td className={`py-2 pr-3 font-semibold ${statusColor(row.status)}`}>
                    {row.status}
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{row.channelType}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.impressions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.clicks, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(row.cost, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.conversions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatPercent(row.ctr * 100, 2, locale)}</td>
                  <td className="py-2 text-right">{formatBRL(row.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
