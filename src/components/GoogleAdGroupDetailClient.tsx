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

type AdRow = {
  id: string;
  name: string;
  status: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
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
  const tMetrics = useTranslations("metrics");
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

  const loadAds = useCallback(() => {
    setRows(null);
    setError(null);
    fetch(`${base}/ads?adGroupId=${adGroupId}&since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setRows(j.rows ?? []) : setError(j.error ?? "error")))
      .catch(() => setError("error"));
  }, [base, adGroupId, range]);

  useEffect(() => void loadAds(), [loadAds]);

  const sort = useTableSort<AdRow>(rows ?? [], "cost", "desc");
  const activeAds = sort.sorted.filter((a) => a.status === "ENABLED");
  const inactiveCount = sort.sorted.length - activeAds.length;
  const visibleAds = showAll ? sort.sorted : activeAds;

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
        <div className="text-sm font-semibold text-[var(--text-main)]">{t("googleAdsTitle")}</div>
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
                        <td className={`py-2 pr-3 ${googleStatusColor(a.status)}`}>
                          {googleStatusLabel(a.status, locale)}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatNumber(a.impressions, locale)}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(a.clicks, locale)}</td>
                        <td className="py-2 pr-3 text-right">{formatBRL(a.cost, locale)}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(a.conversions, locale)}</td>
                        <td className="py-2 pr-3 text-right">{formatPercent(a.ctr * 100, 2, locale)}</td>
                        <td className="py-2 text-right">{formatBRL(a.averageCpc, locale)}</td>
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
