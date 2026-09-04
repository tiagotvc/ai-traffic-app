"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { GoogleCampaignChart } from "@/components/GoogleCampaignChart";
import { ClientGoogleBreakdowns } from "@/components/ClientGoogleBreakdowns";
import { GoogleRowActions, useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { GoogleNavBar } from "@/components/google/GoogleNavBar";
import { googleStatusLabel } from "@/components/google/googleStatus";
import { useGoogleDateRange } from "@/components/google/useGoogleDateRange";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker } from "@/components/GoogleDateRangePicker";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { GoogleTableColumnsButton, useGoogleTableColumns } from "@/components/google/GoogleTableColumnsButton";
import { googleDerivedMetrics, type GoogleTableColumnId } from "@/lib/google-table-columns";

type AdGroupRow = {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
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
  const locale = useLocale();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;

  const [range, setRange] = useGoogleDateRange(clientId);
  const [channelType, setChannelType] = useState<string>("");
  const [campaignStatus, setCampaignStatus] = useState<string>("");
  const [rows, setRows] = useState<AdGroupRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { node: feedback, notify } = useGoogleActionFeedback();
  const [columns, setColumns] = useGoogleTableColumns("adGroups");

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

  const displayRows = (rows ?? []).map(googleDerivedMetrics);
  const sort = useTableSort<(typeof displayRows)[number]>(displayRows, "cost", "desc");
  const columnValue = (row: (typeof displayRows)[number], column: GoogleTableColumnId) => {
    if (column === "status") return googleStatusLabel(row.status, locale);
    if (column === "channelType" || column === "type") return "—";
    const value = row[column];
    if (column === "cost" || column === "averageCpc" || column === "costPerConversion" || column === "conversionValue" || column === "valuePerConversion") return formatBRL(value, locale);
    if (column === "roas") return `${formatNumber(value, locale)}x`;
    if (column === "ctr" || column === "conversionRate") return formatPercent(value * 100, 2, locale);
    return formatNumber(value, locale);
  };
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
        title={<GoogleNavBar clientId={clientId} campaignId={campaignId} />}
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("googleAdGroupsTitle")}</div>
          <GoogleTableColumnsButton kind="adGroups" columns={columns} onChange={setColumns} />
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
                  {columns.map((column) => <SortableTh key={column} label={t(`googleColumn_${column}`)} sortKey={column} activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align={column === "status" ? "left" : "right"} wrapLabel />)}
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
                        className="text-left hover:text-[var(--ui-accent)]"
                      >
                        {g.name}
                      </Link>
                    </td>
                    {columns.map((column) => <td key={column} className={`whitespace-nowrap py-2 pr-3 ${column === "status" ? `text-left font-semibold ${statusColor(g.status)}` : "text-right"}`}>{columnValue(g, column)}</td>)}
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
