"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ClientGoogleKeywords } from "@/components/ClientGoogleKeywords";
import { ClientGoogleRecommendations } from "@/components/ClientGoogleRecommendations";
import { ClientGoogleAdPreviewModal } from "@/components/ClientGoogleAdPreviewModal";
import { GoogleRowActions, useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { GoogleNavBar } from "@/components/google/GoogleNavBar";
import { AddKeywordModal } from "@/components/google/AddKeywordModal";
import { googleStatusColor, googleStatusLabel } from "@/components/google/googleStatus";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker } from "@/components/GoogleDateRangePicker";
import { useGoogleDateRange } from "@/components/google/useGoogleDateRange";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { GoogleTableColumnsButton, useGoogleTableColumns } from "@/components/google/GoogleTableColumnsButton";
import { googleDerivedMetrics, type GoogleTableColumnId } from "@/lib/google-table-columns";

type AdRow = {
  id: string;
  name: string;
  status: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  averageCpc: number;
};
/**
 * Tela dedicada de detalhe de um grupo de anúncios Google Ads. Concentra tudo no
 * contexto do grupo (recomendações, palavras-chave, termos, anúncios) com UM filtro
 * de data global e seletores no topo para trocar de campanha/grupo sem voltar.
 */
export function GoogleAdGroupDetailClient({
  clientId,
  campaignId,
  adGroupId
}: {
  clientId: string;
  campaignId: string;
  adGroupId: string;
}) {
  const t = useTranslations("client");
  const locale = useLocale();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
  const scope = { campaignId, adGroupId };

  const [range, setRange] = useGoogleDateRange(clientId);
  const [rows, setRows] = useState<AdRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"keyword" | "negative" | null>(null);
  const [kwReload, setKwReload] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const { node: feedback, notify } = useGoogleActionFeedback();
  const [columns, setColumns] = useGoogleTableColumns("ads");

  const loadAds = useCallback(() => {
    setRows(null);
    setError(null);
    fetch(`${base}/ads?adGroupId=${adGroupId}&since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setRows(j.rows ?? []) : setError(j.error ?? "error")))
      .catch(() => setError("error"));
  }, [base, adGroupId, range]);

  useEffect(() => void loadAds(), [loadAds]);

  const displayRows = (rows ?? []).map(googleDerivedMetrics);
  const sort = useTableSort<(typeof displayRows)[number]>(displayRows, "cost", "desc");
  const activeAds = sort.sorted.filter((a) => a.status === "ENABLED");
  const inactiveCount = sort.sorted.length - activeAds.length;
  const visibleAds = showAll ? sort.sorted : activeAds;
  const columnValue = (row: (typeof displayRows)[number], column: GoogleTableColumnId) => {
    if (column === "status") return googleStatusLabel(row.status, locale);
    if (column === "type") return row.type || "—";
    if (column === "channelType") return "—";
    const value = row[column];
    if (column === "cost" || column === "averageCpc" || column === "costPerConversion" || column === "conversionValue" || column === "valuePerConversion") return formatBRL(value, locale);
    if (column === "roas") return `${formatNumber(value, locale)}x`;
    if (column === "ctr" || column === "conversionRate") return formatPercent(value * 100, 2, locale);
    return formatNumber(value, locale);
  };

  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={
          <Link href={`/clients/${clientId}/google/campaigns/${campaignId}`} className="ui-link">
            ← {t("googleBackToCampaign")}
          </Link>
        }
        title={
          <GoogleNavBar
            clientId={clientId}
            campaignId={campaignId}
            adGroupId={adGroupId}
            onSelectAd={setSelectedAdId}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <GoogleDateRangePicker value={range} onChange={setRange} />
            <button
              type="button"
              onClick={() => setAddMode("keyword")}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              + {t("googleAddKeyword")}
            </button>
            <button
              type="button"
              onClick={() => setAddMode("negative")}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              + {t("googleAddNegative")}
            </button>
          </div>
        }
      />

      {feedback}

      {/* Avaliação de palavras-chave — no contexto do grupo, com data global. */}
      <ClientGoogleRecommendations clientId={clientId} scope={scope} range={range} />

      {/* Palavras-chave + termos de busca do grupo. */}
      <ClientGoogleKeywords clientId={clientId} scope={scope} reloadSignal={kwReload} range={range} />

      <AddKeywordModal
        clientId={clientId}
        adGroupId={adGroupId}
        mode={addMode ?? "keyword"}
        open={addMode !== null}
        onClose={() => setAddMode(null)}
        onDone={() => setKwReload((n) => n + 1)}
        notify={notify}
      />

      {/* Anúncios do grupo — só ativos por padrão, "Ver mais" revela os pausados. */}
      <div className="ui-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("googleAdsTitle")}</div>
          <GoogleTableColumnsButton kind="ads" columns={columns} onChange={setColumns} />
        </div>
        <div className="mt-3 overflow-x-auto">
          {rows === null && !error ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-xs text-[var(--text-dim)]">
              {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
            </div>
          ) : !rows || rows.length === 0 ? (
            <div className="text-xs text-[var(--text-dim)]">{t("googleNoAds")}</div>
          ) : (
            <>
              {visibleAds.length === 0 ? (
                <div className="text-xs text-[var(--text-dim)]">{t("googleNoActiveAds")}</div>
              ) : (
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="text-left text-[var(--text-dimmer)]">
                      <th className="py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                      <SortableTh label={t("googleAdsTitle")} sortKey="name" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                      {columns.map((column) => <SortableTh key={column} label={t(`googleColumn_${column}`)} sortKey={column} activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align={column === "status" || column === "type" ? "left" : "right"} wrapLabel />)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAds.map((a) => (
                      <tr key={a.id} className="border-t border-[var(--border-color)]">
                        <td className="py-2 pr-3 text-left">
                          <GoogleRowActions
                            clientId={clientId}
                            resource="ad"
                            id={a.id}
                            adGroupId={adGroupId}
                            status={a.status}
                            onDone={loadAds}
                            notify={notify}
                          />
                        </td>
                        <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                          <button
                            type="button"
                            onClick={() => setSelectedAdId(a.id)}
                            className="text-left hover:text-[var(--ui-accent)] hover:underline"
                          >
                            {a.name || `#${a.id}`}
                          </button>
                        </td>
                        {columns.map((column) => <td key={column} className={`whitespace-nowrap py-2 pr-3 ${column === "status" || column === "type" ? `text-left ${column === "status" ? googleStatusColor(a.status) : ""}` : "text-right"}`}>{columnValue(a, column)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {inactiveCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="ui-link mt-3 text-xs font-semibold"
                >
                  {showAll ? t("googleShowLess") : t("googleShowMoreAds", { count: inactiveCount })}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ClientGoogleAdPreviewModal
        clientId={clientId}
        adId={selectedAdId}
        since={range.since}
        until={range.until}
        onClose={() => setSelectedAdId(null)}
      />
    </div>
  );
}
