"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { GoogleRowActions, useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, lastNDaysRange } from "@/components/GoogleDateRangePicker";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

type CampaignRow = {
  campaignId: string;
  name: string;
  status: string;
  channelType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

function statusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}

/**
 * Lista de campanhas Google Ads do cliente. Cada campanha navega para a tela
 * dedicada de detalhe (drill por rota, não mais expansão inline).
 */
export function ClientGoogleAdsPanel({
  clientId,
  showSyncButton = true,
  campaignHref
}: {
  clientId: string;
  /** false quando o sync é feito por um botão externo (ex.: sync contextual do hub). */
  showSyncButton?: boolean;
  /** Href do detalhe da campanha. Default: tela dedicada do drill Google. */
  campaignHref?: (campaignId: string) => string;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(() => lastNDaysRange(30));
  const [syncing, startSync] = useTransition();

  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
  const hrefFor =
    campaignHref ?? ((id: string) => `/clients/${clientId}/google/campaigns/${id}`);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    return fetch(`${base}/metrics?since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.campaigns ?? []);
        else setError(j.error ?? "error");
      })
      .catch(() => setError("error"));
  }, [base, range]);

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
    // O backfill trabalha por janela de dias; deriva a partir do intervalo selecionado.
    const days = Math.max(
      1,
      Math.round((Date.parse(range.until) - Date.parse(range.since)) / 86_400_000)
    );
    startSync(async () => {
      await fetch(`${base}/sync?days=${days}`, { method: "POST" }).catch(() => undefined);
      await load();
    });
  }

  const sort = useTableSort<CampaignRow>(rows ?? [], "cost", "desc");
  const { node: feedback, notify } = useGoogleActionFeedback();

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
          <GoogleDateRangePicker value={range} onChange={setRange} />
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

      {feedback ? <div className="mt-3">{feedback}</div> : null}

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
                <SortableTh label={t("googleAdsColCampaign")} sortKey="name" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                <th className="py-2 pr-3">{t("googleAdsColStatus")}</th>
                <th className="py-2 pr-3">{t("googleAdsColChannel")}</th>
                <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <th className="py-2 pl-3 text-right">{t("googleActionsCol")}</th>
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((row) => (
                <tr key={row.campaignId} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                    <Link
                      href={hrefFor(row.campaignId)}
                      className="inline-flex items-center gap-1 text-left hover:text-[var(--ui-accent)]"
                    >
                      <ChevronRight size={13} />
                      <span>{row.name}</span>
                    </Link>
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${statusColor(row.status)}`}>
                    {row.status}
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{row.channelType}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.impressions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.clicks, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(row.cost, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.conversions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatPercent(row.ctr * 100, 2, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(row.averageCpc, locale)}</td>
                  <td className="py-2 pl-3 text-right">
                    <GoogleRowActions
                      clientId={clientId}
                      resource="campaign"
                      id={row.campaignId}
                      status={row.status}
                      onDone={load}
                      notify={notify}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
