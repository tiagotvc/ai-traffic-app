"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, lastNDaysRange } from "@/components/GoogleDateRangePicker";

type Metricish = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};
type KeywordRow = Metricish & {
  text: string;
  matchType: string;
  status: string;
  campaignName: string;
  adGroupName: string;
};
type TermRow = Metricish & {
  searchTerm: string;
  status: string;
  triggeringKeyword: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
};
type CampaignOpt = { campaignId: string; name: string };
type AdGroupOpt = { id: string; name: string };

type Tab = "keywords" | "terms";

const MATCH_LABELS: Record<string, { pt: string; en: string }> = {
  EXACT: { pt: "Exata", en: "Exact" },
  PHRASE: { pt: "Frase", en: "Phrase" },
  BROAD: { pt: "Ampla", en: "Broad" }
};
const KW_STATUS: Record<string, { pt: string; en: string }> = {
  ENABLED: { pt: "Ativa", en: "Enabled" },
  PAUSED: { pt: "Pausada", en: "Paused" },
  REMOVED: { pt: "Removida", en: "Removed" }
};
const TERM_STATUS: Record<string, { pt: string; en: string }> = {
  ADDED: { pt: "Adicionado", en: "Added" },
  EXCLUDED: { pt: "Excluído", en: "Excluded" },
  ADDED_EXCLUDED: { pt: "Adic.+Excl.", en: "Added+Excl." },
  NONE: { pt: "—", en: "—" },
  UNKNOWN: { pt: "—", en: "—" }
};
function label(map: Record<string, { pt: string; en: string }>, raw: string, locale: string): string {
  const lang = locale.startsWith("en") ? "en" : "pt";
  return map[raw]?.[lang] ?? raw;
}
function termStatusColor(status: string): string {
  if (status === "EXCLUDED") return "text-amber-400";
  if (status === "ADDED" || status === "ADDED_EXCLUDED") return "text-emerald-400";
  return "text-[var(--text-dimmer)]";
}

export function ClientGoogleKeywords({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;

  const [tab, setTab] = useState<Tab>("keywords");
  const [range, setRange] = useState(() => lastNDaysRange(30));
  const [campaignId, setCampaignId] = useState("");
  const [adGroupId, setAdGroupId] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [adGroupOpts, setAdGroupOpts] = useState<AdGroupOpt[]>([]);
  const [kwRows, setKwRows] = useState<KeywordRow[] | null>(null);
  const [termRows, setTermRows] = useState<TermRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce do filtro de palavra-chave (aba Termos).
  useEffect(() => {
    const id = setTimeout(() => setKeyword(keywordInput.trim()), 400);
    return () => clearTimeout(id);
  }, [keywordInput]);

  // Campanhas para o dropdown (via snapshots).
  useEffect(() => {
    fetch(`${base}/metrics?since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setCampaigns(
            (j.campaigns ?? []).map((c: { campaignId: string; name: string }) => ({
              campaignId: c.campaignId,
              name: c.name
            }))
          );
        }
      })
      .catch(() => {});
  }, [base, range]);

  // Grupos de anúncios dependentes da campanha selecionada.
  useEffect(() => {
    setAdGroupId("");
    if (!campaignId) {
      setAdGroupOpts([]);
      return;
    }
    fetch(`${base}/adgroups?campaignId=${campaignId}&since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setAdGroupOpts(
            (j.rows ?? []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))
          );
        }
      })
      .catch(() => setAdGroupOpts([]));
  }, [base, campaignId, range]);

  const load = useCallback(() => {
    setError(null);
    const p = new URLSearchParams({ since: range.since, until: range.until });
    if (campaignId) p.set("campaignId", campaignId);
    if (adGroupId) p.set("adGroupId", adGroupId);
    if (tab === "keywords") {
      setKwRows(null);
      fetch(`${base}/keywords?${p}`)
        .then((r) => r.json())
        .then((j) => (j.ok ? setKwRows(j.rows ?? []) : setError(j.error ?? "error")))
        .catch(() => setError("error"));
    } else {
      setTermRows(null);
      if (keyword) p.set("keyword", keyword);
      fetch(`${base}/search-terms?${p}`)
        .then((r) => r.json())
        .then((j) => (j.ok ? setTermRows(j.rows ?? []) : setError(j.error ?? "error")))
        .catch(() => setError("error"));
    }
  }, [base, tab, range, campaignId, adGroupId, keyword]);

  useEffect(() => void load(), [load]);

  const kwSort = useTableSort<KeywordRow>(kwRows ?? [], "cost", "desc");
  const termSort = useTableSort<TermRow>(termRows ?? [], "cost", "desc");

  const rowsLoading = tab === "keywords" ? kwRows === null : termRows === null;
  const rowsEmpty = tab === "keywords" ? kwRows?.length === 0 : termRows?.length === 0;

  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["keywords", "terms"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                tab === tb
                  ? "border-transparent bg-[var(--ui-accent)] text-white"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              }`}
            >
              {t(tb === "keywords" ? "googleKeywordsTab" : "googleTermsTab")}
            </button>
          ))}
        </div>
        <GoogleDateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Filtros */}
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="rounded-xl ui-input text-xs"
        >
          <option value="">{t("googleFilterAllCampaigns")}</option>
          {campaigns.map((c) => (
            <option key={c.campaignId} value={c.campaignId}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={adGroupId}
          onChange={(e) => setAdGroupId(e.target.value)}
          disabled={!campaignId}
          className="rounded-xl ui-input text-xs disabled:opacity-50"
        >
          <option value="">{t("googleFilterAllAdGroups")}</option>
          {adGroupOpts.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {tab === "terms" ? (
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t("googleFilterKeyword")}
            className="min-w-[160px] flex-1 rounded-xl ui-input text-xs"
          />
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto">
        {rowsLoading && !error ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-xs text-[var(--text-dim)]">
            {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
          </div>
        ) : rowsEmpty ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleBreakdownEmpty")}</div>
        ) : tab === "keywords" ? (
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <SortableTh label={t("googleKeywordsTab")} sortKey="text" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh label={t("googleColMatch")} sortKey="matchType" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh label={t("googleAdsColStatus")} sortKey="status" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh label={t("googleColAdGroup")} sortKey="adGroupName" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {kwSort.sorted.map((r, i) => (
                <tr key={`${r.text}-${i}`} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">{r.text}</td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{label(MATCH_LABELS, r.matchType, locale)}</td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{label(KW_STATUS, r.status, locale)}</td>
                  <td className="py-2 pr-3 text-[var(--text-dimmer)]">{r.adGroupName}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.impressions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.clicks, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(r.cost, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.conversions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatPercent(r.ctr * 100, 2, locale)}</td>
                  <td className="py-2 text-right">{formatBRL(r.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <SortableTh label={t("googleTermsTab")} sortKey="searchTerm" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh label={t("googleColTriggeringKeyword")} sortKey="triggeringKeyword" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh label={t("googleAdsColStatus")} sortKey="status" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh label={t("googleColAdGroup")} sortKey="adGroupName" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {termSort.sorted.map((r, i) => (
                <tr key={`${r.searchTerm}-${r.triggeringKeyword}-${i}`} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">{r.searchTerm}</td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{r.triggeringKeyword || "—"}</td>
                  <td className={`py-2 pr-3 ${termStatusColor(r.status)}`}>{label(TERM_STATUS, r.status, locale)}</td>
                  <td className="py-2 pr-3 text-[var(--text-dimmer)]">{r.adGroupName}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.impressions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.clicks, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(r.cost, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.conversions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatPercent(r.ctr * 100, 2, locale)}</td>
                  <td className="py-2 text-right">{formatBRL(r.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
