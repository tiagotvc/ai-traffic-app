"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { GoogleRowActions, useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { SearchTermActions } from "@/components/google/SearchTermActions";
import { useGoogleDateRange } from "@/components/google/useGoogleDateRange";
import { googleStatusLabel } from "@/components/google/googleStatus";
import { ClientGoogleAdPreviewModal } from "@/components/ClientGoogleAdPreviewModal";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, type DateRange } from "@/components/GoogleDateRangePicker";
import { GoogleRecBadge, type GoogleRecActionType } from "@/components/google/googleRecBadge";

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
  criterionId: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
};
type TermRow = Metricish & {
  searchTerm: string;
  status: string;
  triggeringKeyword: string;
  matchType: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
};
type AdRow = Metricish & { id: string; name: string; status: string; type: string };
type NegativeRow = {
  text: string;
  matchType: string;
  status: string;
  criterionId: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
  level?: "adGroup" | "campaign" | "sharedSet";
  sharedSetName?: string;
};
type CampaignOpt = { campaignId: string; name: string };
type AdGroupOpt = { id: string; name: string };
type AdOpt = { id: string; name: string };

type Tab = "keywords" | "negatives" | "terms" | "ads";

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
function statusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}
function termStatusColor(status: string): string {
  if (status === "EXCLUDED") return "text-rose-600 dark:text-rose-400";
  if (status === "ADDED_EXCLUDED") return "text-rose-600 dark:text-rose-400";
  if (status === "ADDED") return "text-emerald-600 dark:text-emerald-400";
  return "text-[var(--text-dimmer)]";
}
/** Normaliza texto de termo/keyword para casar recomendação ↔ linha da tabela. */
function normTerm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
type TermRec = { actionType: GoogleRecActionType; reason: string | null };

export function ClientGoogleKeywords({
  clientId,
  scope,
  reloadSignal,
  range: propRange
}: {
  clientId: string;
  /** Quando fornecido, fixa campanha/grupo e esconde os dropdowns em cascata (uso no drill). */
  scope?: { campaignId: string; adGroupId?: string };
  /** Muda de valor para forçar recarregar (ex.: após adicionar palavra-chave). */
  reloadSignal?: number;
  /** Quando fornecido, o intervalo é controlado externamente (filtro global da página). */
  range?: DateRange;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const { node: feedback, notify } = useGoogleActionFeedback();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
  const scoped = !!scope;

  const [tab, setTab] = useState<Tab>("keywords");
  const [ownRange, setOwnRange] = useGoogleDateRange(clientId);
  const range = propRange ?? ownRange;
  const [campaignId, setCampaignId] = useState(scope?.campaignId ?? "");
  const [adGroupId, setAdGroupId] = useState(scope?.adGroupId ?? "");
  const [adId, setAdId] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [adGroupOpts, setAdGroupOpts] = useState<AdGroupOpt[]>([]);
  const [adOpts, setAdOpts] = useState<AdOpt[]>([]);
  const [kwRows, setKwRows] = useState<KeywordRow[] | null>(null);
  const [termRows, setTermRows] = useState<TermRow[] | null>(null);
  const [adRows, setAdRows] = useState<AdRow[] | null>(null);
  const [negRows, setNegRows] = useState<NegativeRow[] | null>(null);
  const [adsReload, setAdsReload] = useState(0);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Recomendações da IA/regras mapeadas por (grupo + termo) → badge inline na aba Termos.
  const [recByTerm, setRecByTerm] = useState<Map<string, TermRec>>(new Map());
  // Override otimista de status dos termos (negativar/adicionar): evita refetch ao vivo e marca na hora.
  const [termOverrides, setTermOverrides] = useState<Map<string, string>>(new Map());
  const markTermStatus = useCallback((row: TermRow, op: "add" | "addNegative") => {
    const key = `${row.adGroupId}::${normTerm(row.searchTerm)}`;
    setTermOverrides((prev) => {
      const cur = prev.get(key) ?? row.status;
      const excluded = cur === "EXCLUDED" || cur === "ADDED_EXCLUDED";
      const added = cur === "ADDED" || cur === "ADDED_EXCLUDED";
      const next =
        op === "addNegative"
          ? added
            ? "ADDED_EXCLUDED"
            : "EXCLUDED"
          : excluded
            ? "ADDED_EXCLUDED"
            : "ADDED";
      const m = new Map(prev);
      m.set(key, next);
      return m;
    });
  }, []);

  // Abas: no explorador (não-escopado) inclui "Anúncios"; no drill só keywords/termos.
  const tabs: Tab[] = scoped
    ? ["keywords", "negatives", "terms"]
    : ["keywords", "negatives", "terms", "ads"];

  // Debounce do filtro de texto (aba Termos).
  useEffect(() => {
    const id = setTimeout(() => setKeyword(keywordInput.trim()), 400);
    return () => clearTimeout(id);
  }, [keywordInput]);

  // Reset dos filtros de match/status ao trocar de aba (opções mudam por aba).
  useEffect(() => {
    setMatchFilter("");
    setStatusFilter("");
  }, [tab]);

  // Campanhas para o dropdown (via snapshots). Pulado quando o contexto já é fixo.
  useEffect(() => {
    if (scoped) return;
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
  }, [base, range, scoped]);

  // Grupos dependentes da campanha selecionada (cascata).
  useEffect(() => {
    if (scoped) return;
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
  }, [base, campaignId, range, scoped]);

  // Troca de grupo zera o filtro de anúncio (cascata).
  useEffect(() => {
    if (!scoped) setAdId("");
  }, [adGroupId, scoped]);

  // Anúncios do grupo (cascata): populam o dropdown de anúncio E a aba Anúncios.
  useEffect(() => {
    if (scoped) return;
    if (!adGroupId) {
      setAdOpts([]);
      setAdRows(null);
      return;
    }
    setAdRows(null);
    fetch(`${base}/ads?adGroupId=${adGroupId}&since=${range.since}&until=${range.until}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setAdRows(j.rows ?? []);
          setAdOpts((j.rows ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
        } else {
          setAdRows([]);
        }
      })
      .catch(() => setAdRows([]));
  }, [base, adGroupId, range, scoped, reloadSignal, adsReload]);

  const load = useCallback(() => {
    if (tab === "ads") return; // aba Anúncios é servida pelo efeito de cascata acima.
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
    } else if (tab === "negatives") {
      setNegRows(null);
      fetch(`${base}/negative-keywords?${p}`)
        .then((r) => r.json())
        .then((j) => (j.ok ? setNegRows(j.rows ?? []) : setError(j.error ?? "error")))
        .catch(() => setError("error"));
    } else {
      setTermRows(null);
      if (keyword) p.set("keyword", keyword);
      fetch(`${base}/search-terms?${p}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            setTermRows(j.rows ?? []);
            setTermOverrides(new Map()); // dados frescos são a verdade; zera overrides otimistas
          } else {
            setError(j.error ?? "error");
          }
        })
        .catch(() => setError("error"));
    }
    // reloadSignal força recarregar após mutations (add keyword, etc.).
  }, [base, tab, range, campaignId, adGroupId, keyword, reloadSignal]);

  useEffect(() => void load(), [load]);

  // Recomendações para a aba Termos: mesma inteligência do painel, surgida inline no termo.
  const loadTermRecs = useCallback(() => {
    if (tab !== "terms") return;
    const p = new URLSearchParams({ status: "PENDING" });
    if (campaignId) p.set("campaignId", campaignId);
    if (adGroupId) p.set("adGroupId", adGroupId);
    fetch(`${base}/recommendations?${p}`)
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((j) => {
        const m = new Map<string, TermRec>();
        if (j?.ok && Array.isArray(j.rows)) {
          for (const rec of j.rows as Array<Record<string, unknown>>) {
            const action = rec.actionType as string;
            if (action !== "NEGATIVAR" && action !== "ADICIONAR_KEYWORD") continue;
            const key = `${rec.adGroupId ?? ""}::${normTerm(String(rec.keywordText ?? ""))}`;
            if (!m.has(key)) {
              m.set(key, {
                actionType: action as GoogleRecActionType,
                reason: (rec.aiJustification as string) || (rec.ruleJustification as string) || null
              });
            }
          }
        }
        setRecByTerm(m);
      })
      .catch(() => setRecByTerm(new Map()));
  }, [base, tab, campaignId, adGroupId]);

  // Refaz ao mudar aba/escopo/data ou após um recompute (evento do painel).
  useEffect(() => void loadTermRecs(), [loadTermRecs, reloadSignal, range.since, range.until]);
  useEffect(() => {
    const h = () => loadTermRecs();
    window.addEventListener("google-recs-updated", h);
    return () => window.removeEventListener("google-recs-updated", h);
  }, [loadTermRecs]);

  // Filtros client-side de correspondência/status sobre as linhas carregadas.
  const kwFiltered = useMemo(
    () =>
      (kwRows ?? []).filter(
        (r) => (!matchFilter || r.matchType === matchFilter) && (!statusFilter || r.status === statusFilter)
      ),
    [kwRows, matchFilter, statusFilter]
  );
  const termFiltered = useMemo(
    () =>
      (termRows ?? []).filter(
        (r) => (!matchFilter || r.matchType === matchFilter) && (!statusFilter || r.status === statusFilter)
      ),
    [termRows, matchFilter, statusFilter]
  );
  const adFiltered = useMemo(
    () =>
      (adRows ?? []).filter(
        (r) => (!adId || r.id === adId) && (!statusFilter || r.status === statusFilter)
      ),
    [adRows, adId, statusFilter]
  );
  const negFiltered = useMemo(
    () =>
      (negRows ?? []).filter(
        (r) => (!matchFilter || r.matchType === matchFilter) && (!statusFilter || r.status === statusFilter)
      ),
    [negRows, matchFilter, statusFilter]
  );

  // Opções dos filtros derivadas das linhas atuais (sempre coerentes com os dados).
  const matchOptions = useMemo(() => {
    const src =
      tab === "keywords" ? kwRows : tab === "terms" ? termRows : tab === "negatives" ? negRows : null;
    return [...new Set((src ?? []).map((r) => r.matchType).filter(Boolean))];
  }, [tab, kwRows, termRows, negRows]);
  const statusOptions = useMemo(() => {
    const src =
      tab === "keywords"
        ? kwRows?.map((r) => r.status)
        : tab === "terms"
          ? termRows?.map((r) => r.status)
          : tab === "negatives"
            ? negRows?.map((r) => r.status)
            : adRows?.map((r) => r.status);
    return [...new Set((src ?? []).filter(Boolean))];
  }, [tab, kwRows, termRows, negRows, adRows]);
  const statusMap = tab === "terms" ? TERM_STATUS : KW_STATUS;

  const kwSort = useTableSort<KeywordRow>(kwFiltered, "cost", "desc");
  const termSort = useTableSort<TermRow>(termFiltered, "cost", "desc");
  const adSort = useTableSort<AdRow>(adFiltered, "cost", "desc");
  const negSort = useTableSort<NegativeRow>(negFiltered, "text", "asc");

  const rowsLoading =
    tab === "keywords"
      ? kwRows === null
      : tab === "terms"
        ? termRows === null
        : tab === "negatives"
          ? negRows === null
          : adRows === null;
  const rowsEmpty =
    tab === "keywords"
      ? kwFiltered.length === 0
      : tab === "terms"
        ? termFiltered.length === 0
        : tab === "negatives"
          ? negFiltered.length === 0
          : adFiltered.length === 0;
  const needsGroupForAds = tab === "ads" && !scoped && !adGroupId;

  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {tabs.map((tb) => (
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
              {t(
                tb === "keywords"
                  ? "googleKeywordsTab"
                  : tb === "negatives"
                    ? "googleNegativeKeywordsTab"
                    : tb === "terms"
                      ? "googleTermsTab"
                      : "googleAdsTitle"
              )}
            </button>
          ))}
        </div>
        {propRange ? null : <GoogleDateRangePicker value={range} onChange={setOwnRange} />}
      </div>

      {/* Filtros em cascata + correspondência/status. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {!scoped ? (
          <>
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
            {/* Anúncio: cascata a partir do grupo. Afeta a aba Anúncios. */}
            <select
              value={adId}
              onChange={(e) => setAdId(e.target.value)}
              disabled={!adGroupId}
              title={tab !== "ads" ? t("googleFilterAdHint") : undefined}
              className="rounded-xl ui-input text-xs disabled:opacity-50"
            >
              <option value="">{t("googleFilterAllAds")}</option>
              {adOpts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || `#${a.id}`}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {tab !== "ads" && matchOptions.length > 0 ? (
          <select
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value)}
            className="rounded-xl ui-input text-xs"
          >
            <option value="">{t("googleFilterAllMatches")}</option>
            {matchOptions.map((m) => (
              <option key={m} value={m}>
                {label(MATCH_LABELS, m, locale)}
              </option>
            ))}
          </select>
        ) : null}

        {statusOptions.length > 0 ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl ui-input text-xs"
          >
            <option value="">{t("googleFilterAllStatus")}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {label(statusMap, s, locale)}
              </option>
            ))}
          </select>
        ) : null}

        {tab === "terms" ? (
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t("googleFilterKeyword")}
            className="min-w-[160px] flex-1 rounded-xl ui-input text-xs"
          />
        ) : null}
      </div>

      {feedback ? <div className="mt-3">{feedback}</div> : null}

      <div className="mt-3 overflow-x-auto">
        {needsGroupForAds ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleAdsPickGroup")}</div>
        ) : rowsLoading && !error ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-xs text-[var(--text-dim)]">
            {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
          </div>
        ) : rowsEmpty ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleBreakdownEmpty")}</div>
        ) : tab === "keywords" ? (
          <table className="w-full min-w-[1040px] table-fixed text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="w-[5%] py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                <SortableTh className="w-[16%]" label={t("googleKeywordsTab")} sortKey="text" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh className="w-[12%]" label={t("googleColMatch")} sortKey="matchType" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh className="w-[8%]" label={t("googleAdsColStatus")} sortKey="status" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh className="w-[11%]" label={t("googleColAdGroup")} sortKey="adGroupName" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} />
                <SortableTh className="w-[9%]" label={tMetrics("impressions")} sortKey="impressions" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh className="w-[7%]" label={tMetrics("clicks")} sortKey="clicks" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh className="w-[8%]" label={tMetrics("spend")} sortKey="cost" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh className="w-[9%]" label={tMetrics("conversions")} sortKey="conversions" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh className="w-[6%]" label={tMetrics("ctr")} sortKey="ctr" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
                <SortableTh className="w-[9%]" label={tMetrics("cpc")} sortKey="averageCpc" activeKey={kwSort.sortKey} dir={kwSort.sortDir} onSort={kwSort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {kwSort.sorted.map((r, i) => (
                <tr key={`${r.text}-${i}`} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 text-left">
                    {r.criterionId && r.adGroupId ? (
                      <GoogleRowActions
                        clientId={clientId}
                        resource="keyword"
                        id={r.criterionId}
                        adGroupId={r.adGroupId}
                        status={r.status}
                        onDone={load}
                        notify={notify}
                      />
                    ) : null}
                  </td>
                  <td className="truncate py-2 pr-3 font-medium text-[var(--text-main)]" title={r.text}>{r.text}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dim)]">{label(MATCH_LABELS, r.matchType, locale)}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dim)]">{label(KW_STATUS, r.status, locale)}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dimmer)]" title={r.adGroupName ?? undefined}>{r.adGroupName}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.impressions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.clicks, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatBRL(r.cost, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.conversions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatPercent(r.ctr * 100, 2, locale)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatBRL(r.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "negatives" ? (
          <table className="w-full min-w-[560px] table-fixed text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="w-[8%] py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                <SortableTh className="w-[38%]" label={t("googleNegativeKeywordsTab")} sortKey="text" activeKey={negSort.sortKey} dir={negSort.sortDir} onSort={negSort.toggle} />
                <SortableTh className="w-[16%]" label={t("googleColMatch")} sortKey="matchType" activeKey={negSort.sortKey} dir={negSort.sortDir} onSort={negSort.toggle} />
                <SortableTh className="w-[12%]" label={t("googleAdsColStatus")} sortKey="status" activeKey={negSort.sortKey} dir={negSort.sortDir} onSort={negSort.toggle} />
                <SortableTh className="w-[26%]" label={t("googleColAdGroup")} sortKey="adGroupName" activeKey={negSort.sortKey} dir={negSort.sortDir} onSort={negSort.toggle} />
              </tr>
            </thead>
            <tbody>
              {negSort.sorted.map((r, i) => {
                const lvl = r.level ?? "adGroup";
                const scopeLabel =
                  lvl === "campaign"
                    ? t("googleNegLevelCampaign")
                    : lvl === "sharedSet"
                      ? t("googleNegLevelList", { name: r.sharedSetName || "" })
                      : r.adGroupName;
                return (
                <tr key={`${r.criterionId}-${i}`} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 text-left">
                    {lvl === "adGroup" ? (
                      <GoogleRowActions
                        clientId={clientId}
                        resource="keyword"
                        id={r.criterionId}
                        adGroupId={r.adGroupId}
                        status={r.status}
                        onDone={load}
                        notify={notify}
                        onlyRemove
                      />
                    ) : (
                      <span className="text-[var(--text-dimmer)]">—</span>
                    )}
                  </td>
                  <td className="truncate py-2 pr-3 font-medium text-[var(--text-main)]" title={r.text}>{r.text}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dim)]">{label(MATCH_LABELS, r.matchType, locale)}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dim)]">{label(KW_STATUS, r.status, locale)}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dimmer)]" title={scopeLabel || undefined}>{scopeLabel}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : tab === "terms" ? (
          <table className="w-full min-w-[1080px] table-fixed text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="w-[5%] py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                <SortableTh className="w-[18%]" label={t("googleTermsTab")} sortKey="searchTerm" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh className="w-[12%]" label={t("googleColTriggeringKeyword")} sortKey="triggeringKeyword" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh className="w-[8%]" label={t("googleAdsColStatus")} sortKey="status" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh className="w-[11%]" label={t("googleColAdGroup")} sortKey="adGroupName" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} />
                <SortableTh className="w-[9%]" label={tMetrics("impressions")} sortKey="impressions" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh className="w-[7%]" label={tMetrics("clicks")} sortKey="clicks" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh className="w-[8%]" label={tMetrics("spend")} sortKey="cost" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh className="w-[9%]" label={tMetrics("conversions")} sortKey="conversions" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh className="w-[6%]" label={tMetrics("ctr")} sortKey="ctr" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
                <SortableTh className="w-[7%]" label={tMetrics("cpc")} sortKey="averageCpc" activeKey={termSort.sortKey} dir={termSort.sortDir} onSort={termSort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {termSort.sorted.map((r, i) => {
                const effStatus =
                  termOverrides.get(`${r.adGroupId}::${normTerm(r.searchTerm)}`) ?? r.status;
                const isExcluded = effStatus === "EXCLUDED" || effStatus === "ADDED_EXCLUDED";
                return (
                <tr
                  key={`${r.searchTerm}-${r.triggeringKeyword}-${i}`}
                  className={`border-t border-[var(--border-color)] ${isExcluded ? "bg-rose-500/5" : ""}`}
                >
                  <td className="py-2 pr-3 text-left">
                    <SearchTermActions
                      clientId={clientId}
                      adGroupId={r.adGroupId}
                      text={r.searchTerm}
                      status={effStatus}
                      onDone={(op) => markTermStatus(r, op)}
                      notify={notify}
                    />
                  </td>
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]" title={r.searchTerm}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={`truncate ${isExcluded ? "text-rose-600 line-through dark:text-rose-400" : ""}`}>
                        {r.searchTerm}
                      </span>
                      {(() => {
                        const rec = recByTerm.get(`${r.adGroupId}::${normTerm(r.searchTerm)}`);
                        return rec ? (
                          <GoogleRecBadge
                            actionType={rec.actionType}
                            title={rec.reason ?? undefined}
                            size="sm"
                          />
                        ) : null;
                      })()}
                    </span>
                  </td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dim)]" title={r.triggeringKeyword ?? undefined}>{r.triggeringKeyword || "—"}</td>
                  <td className={`truncate py-2 pr-3 ${termStatusColor(effStatus)}`}>{label(TERM_STATUS, effStatus, locale)}</td>
                  <td className="truncate py-2 pr-3 text-[var(--text-dimmer)]" title={r.adGroupName ?? undefined}>{r.adGroupName}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.impressions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.clicks, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatBRL(r.cost, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(r.conversions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatPercent(r.ctr * 100, 2, locale)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatBRL(r.averageCpc, locale)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[860px] table-fixed text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="w-[6%] py-2 pr-3 text-left">{t("googleActionsCol")}</th>
                <SortableTh className="w-[24%]" label={t("googleAdsTitle")} sortKey="name" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} />
                <SortableTh className="w-[10%]" label={t("googleAdsColStatus")} sortKey="status" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} />
                <SortableTh className="w-[11%]" label={tMetrics("impressions")} sortKey="impressions" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
                <SortableTh className="w-[9%]" label={tMetrics("clicks")} sortKey="clicks" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
                <SortableTh className="w-[10%]" label={tMetrics("spend")} sortKey="cost" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
                <SortableTh className="w-[11%]" label={tMetrics("conversions")} sortKey="conversions" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
                <SortableTh className="w-[8%]" label={tMetrics("ctr")} sortKey="ctr" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
                <SortableTh className="w-[11%]" label={tMetrics("cpc")} sortKey="averageCpc" activeKey={adSort.sortKey} dir={adSort.sortDir} onSort={adSort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {adSort.sorted.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border-color)]">
                  <td className="py-2 pr-3 text-left">
                    <GoogleRowActions
                      clientId={clientId}
                      resource="ad"
                      id={a.id}
                      adGroupId={adGroupId}
                      status={a.status}
                      onDone={() => setAdsReload((n) => n + 1)}
                      notify={notify}
                    />
                  </td>
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                    <button
                      type="button"
                      onClick={() => setSelectedAdId(a.id)}
                      className="block w-full truncate text-left hover:text-[var(--ui-accent)] hover:underline"
                      title={a.name || `#${a.id}`}
                    >
                      {a.name || `#${a.id}`}
                    </button>
                  </td>
                  <td className={`truncate py-2 pr-3 ${statusColor(a.status)}`}>{googleStatusLabel(a.status, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(a.impressions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(a.clicks, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatBRL(a.cost, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatNumber(a.conversions, locale)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatPercent(a.ctr * 100, 2, locale)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatBRL(a.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
