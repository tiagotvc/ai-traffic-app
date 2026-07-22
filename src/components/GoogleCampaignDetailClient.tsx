"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { GoogleCampaignChart } from "@/components/GoogleCampaignChart";
import { ClientGoogleBreakdowns } from "@/components/ClientGoogleBreakdowns";
import { GoogleRowActions, useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, lastNDaysRange } from "@/components/GoogleDateRangePicker";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

type AdGroupRow = {
  id: string;
  name: string;
  status: string;
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
 * Tela dedicada de detalhe de uma campanha Google Ads: gráfico exclusivo (série
 * diária) + tabela de grupos de anúncios (drill para keywords/termos) + breakdowns
 * da campanha. Espelha o fluxo do Meta, mas com a lógica própria do Google.
 */
export function GoogleCampaignDetailClient({
  clientId,
  campaignId
}: {
  clientId: string;
  campaignId: string;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;

  const [range, setRange] = useState(() => lastNDaysRange(30));
  const [campaignName, setCampaignName] = useState<string>("");
  const [channelType, setChannelType] = useState<string>("");
  const [campaignStatus, setCampaignStatus] = useState<string>("");
  const [rows, setRows] = useState<AdGroupRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { node: feedback, notify } = useGoogleActionFeedback();

  // Nome/canal da campanha a partir dos snapshots agregados.
  useEffect(() => {
    fetch(`${base}/metrics?since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        const c = (j.campaigns ?? []).find(
          (x: { campaignId: string }) => x.campaignId === campaignId
        );
        if (c) {
          setCampaignName(c.name ?? "");
          setChannelType(c.channelType ?? "");
          setCampaignStatus(c.status ?? "");
        }
      })
      .catch(() => {});
  }, [base, campaignId, range]);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    fetch(`${base}/adgroups?campaignId=${campaignId}&since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setRows(j.rows ?? []) : setError(j.error ?? "error")))
      .catch(() => setError("error"));
  }, [base, campaignId, range]);

  useEffect(() => void load(), [load]);

  const sort = useTableSort<AdGroupRow>(rows ?? [], "cost", "desc");
  const groupHref = (adGroupId: string) =>
    `/clients/${clientId}/google/campaigns/${campaignId}/adgroups/${adGroupId}`;

  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={
          <Link href={`/clients/${clientId}`} className="ui-link">
            ← {t("googleBackToCampaigns")}
          </Link>
        }
        title={campaignName || t("googleAdsPanelTitle")}
        subtitle={channelType || undefined}
        actions={
          <div className="flex items-center gap-2">
            {campaignStatus ? (
              <GoogleRowActions
                clientId={clientId}
                resource="campaign"
                id={campaignId}
                status={campaignStatus}
                onDone={load}
                notify={notify}
              />
            ) : null}
            <GoogleDateRangePicker value={range} onChange={setRange} />
          </div>
        }
      />

      {feedback}

      <GoogleCampaignChart
        clientId={clientId}
        campaignId={campaignId}
        since={range.since}
        until={range.until}
      />

      <div className="ui-card p-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">
          {t("googleAdGroupsTitle")}
        </div>
        <div className="mt-3 overflow-x-auto">
          {rows === null && !error ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-xs text-[var(--text-dim)]">
              {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
            </div>
          ) : rows && rows.length === 0 ? (
            <div className="text-xs text-[var(--text-dim)]">{t("googleNoAdGroups")}</div>
          ) : (
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-left text-[var(--text-dimmer)]">
                  <th className="py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                  <SortableTh label={t("googleColAdGroup")} sortKey="name" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                  <SortableTh label={t("googleAdsColStatus")} sortKey="status" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                  <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                  <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                  <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                  <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                  <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                  <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                </tr>
              </thead>
              <tbody>
                {sort.sorted.map((g) => (
                  <tr key={g.id} className="border-t border-[var(--border-color)]">
                    <td className="py-2 pr-3 text-left">
                      <GoogleRowActions
                        clientId={clientId}
                        resource="adGroup"
                        id={g.id}
                        status={g.status}
                        onDone={load}
                        notify={notify}
                      />
                    </td>
                    <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                      <Link
                        href={groupHref(g.id)}
                        className="inline-flex items-center gap-1 text-left hover:text-[var(--ui-accent)]"
                      >
                        <ChevronRight size={13} />
                        <span>{g.name}</span>
                      </Link>
                    </td>
                    <td className={`py-2 pr-3 font-semibold ${statusColor(g.status)}`}>{g.status}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(g.impressions, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(g.clicks, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatBRL(g.cost, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(g.conversions, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(g.ctr * 100, 2, locale)}</td>
                    <td className="py-2 text-right">{formatBRL(g.averageCpc, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ClientGoogleBreakdowns clientId={clientId} campaignId={campaignId} />
    </div>
  );
}
