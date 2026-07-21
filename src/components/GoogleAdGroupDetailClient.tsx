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
import { AddKeywordModal } from "@/components/google/AddKeywordModal";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, lastNDaysRange } from "@/components/GoogleDateRangePicker";
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

function statusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}

/**
 * Tela dedicada de detalhe de um grupo de anúncios Google Ads. Concentra tudo no
 * contexto do grupo: recomendações de palavra-chave, palavras-chave, termos de
 * busca e anúncios — resolvendo o caminho antes confuso de "avaliar palavras-chave".
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

  const [adGroupName, setAdGroupName] = useState("");
  const [range, setRange] = useState(() => lastNDaysRange(30));
  const [rows, setRows] = useState<AdRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"keyword" | "negative" | null>(null);
  const [kwReload, setKwReload] = useState(0);
  const { node: feedback, notify } = useGoogleActionFeedback();

  // Nome do grupo (busca por campanha e filtra pelo id).
  useEffect(() => {
    const r = lastNDaysRange(30);
    fetch(`${base}/adgroups?campaignId=${campaignId}&since=${r.since}&until=${r.until}`)
      .then((res) => res.json())
      .then((j) => {
        if (!j.ok) return;
        const g = (j.rows ?? []).find((x: { id: string }) => x.id === adGroupId);
        if (g) setAdGroupName(g.name ?? "");
      })
      .catch(() => {});
  }, [base, campaignId, adGroupId]);

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

  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={
          <Link
            href={`/clients/${clientId}/google/campaigns/${campaignId}`}
            className="ui-link"
          >
            ← {t("googleBackToCampaign")}
          </Link>
        }
        title={adGroupName || t("googleColAdGroup")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Avaliação de palavras-chave — agora no contexto do grupo. */}
      <ClientGoogleRecommendations clientId={clientId} scope={scope} />

      {/* Palavras-chave + termos de busca do grupo. */}
      <ClientGoogleKeywords clientId={clientId} scope={scope} reloadSignal={kwReload} />

      <AddKeywordModal
        clientId={clientId}
        adGroupId={adGroupId}
        mode={addMode ?? "keyword"}
        open={addMode !== null}
        onClose={() => setAddMode(null)}
        onDone={() => setKwReload((n) => n + 1)}
        notify={notify}
      />

      {/* Anúncios do grupo. */}
      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--text-main)]">
            {t("googleAdsTitle")}
          </div>
          <GoogleDateRangePicker value={range} onChange={setRange} />
        </div>
        <div className="mt-3 overflow-x-auto">
          {rows === null && !error ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-xs text-[var(--text-dim)]">
              {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
            </div>
          ) : rows && rows.length === 0 ? (
            <div className="text-xs text-[var(--text-dim)]">{t("googleNoAds")}</div>
          ) : (
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-left text-[var(--text-dimmer)]">
                  <SortableTh label={t("googleAdsTitle")} sortKey="name" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                  <SortableTh label={t("googleAdsColStatus")} sortKey="status" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
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
                {sort.sorted.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border-color)]">
                    <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                      <button
                        type="button"
                        onClick={() => setSelectedAdId(a.id)}
                        className="text-left hover:text-[var(--ui-accent)] hover:underline"
                      >
                        {a.name || `#${a.id}`}
                      </button>
                    </td>
                    <td className={`py-2 pr-3 ${statusColor(a.status)}`}>{a.status}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(a.impressions, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(a.clicks, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatBRL(a.cost, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(a.conversions, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(a.ctr * 100, 2, locale)}</td>
                    <td className="py-2 pr-3 text-right">{formatBRL(a.averageCpc, locale)}</td>
                    <td className="py-2 pl-3 text-right">
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
                  </tr>
                ))}
              </tbody>
            </table>
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
