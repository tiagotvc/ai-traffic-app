import { repositories } from "@/db/repositories";
import {
  fetchAdInsightsForAccount,
  fetchAdInsightsForCampaign,
  fetchAdsWithUsageForAccount,
  fetchAdsWithUsageForCampaign,
  probeAdAccountAccess,
  type AdInsightMetrics,
  type AdUsageRow
} from "@/lib/meta-graph";

/**
 * Busca os anúncios de uma conta tentando cada token (primário e fallback).
 * Se um token não tem acesso à conta, a chamada lança — então tentamos o próximo,
 * em vez de descartar a conta silenciosamente.
 */
/**
 * Checa, entre todos os tokens, se algum tem acesso a nível de conta.
 * ok=true assim que um token passa; senão devolve o motivo do último erro.
 */
export async function probeAdAccountAccessAnyToken(
  tokens: Array<string | null | undefined>,
  accountId: string
): Promise<{ ok: boolean; reason: string | null }> {
  let reason: string | null = null;
  for (const token of tokens) {
    if (!token) continue;
    const r = await probeAdAccountAccess(token, accountId);
    if (r.ok) return { ok: true, reason: null };
    reason = r.error ?? reason;
  }
  return { ok: false, reason };
}

export async function fetchAdsForAccountAnyToken(
  tokens: Array<string | null | undefined>,
  accountId: string
): Promise<{ ads: AdUsageRow[]; ok: boolean; errors: number; lastError?: string }> {
  let errors = 0;
  let lastError: string | undefined;
  for (const token of tokens) {
    if (!token) continue;
    try {
      const ads = await fetchAdsWithUsageForAccount(token, accountId);
      return { ads, ok: true, errors };
    } catch (e) {
      errors += 1;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ads: [], ok: false, errors, lastError };
}

/** Insights por anúncio tentando cada token; o primeiro que retornar dados vence. */
export async function fetchInsightsForAccountAnyToken(
  tokens: Array<string | null | undefined>,
  accountId: string,
  opts?: { since?: string | null; until?: string | null }
): Promise<Map<string, AdInsightMetrics>> {
  let last: Map<string, AdInsightMetrics> = new Map();
  for (const token of tokens) {
    if (!token) continue;
    const m = await fetchAdInsightsForAccount(token, accountId, opts);
    if (m.size) return m;
    last = m;
  }
  return last;
}

/** Anúncios de uma CAMPANHA tentando cada token. */
export async function fetchAdsForCampaignAnyToken(
  tokens: Array<string | null | undefined>,
  campaignId: string
): Promise<{ ads: AdUsageRow[]; ok: boolean; errors: number }> {
  let errors = 0;
  for (const token of tokens) {
    if (!token) continue;
    try {
      const ads = await fetchAdsWithUsageForCampaign(token, campaignId);
      return { ads, ok: true, errors };
    } catch {
      errors += 1;
    }
  }
  return { ads: [], ok: false, errors };
}

/** Insights por anúncio de uma CAMPANHA tentando cada token. */
export async function fetchInsightsForCampaignAnyToken(
  tokens: Array<string | null | undefined>,
  campaignId: string,
  opts?: { datePreset?: string; since?: string | null; until?: string | null }
): Promise<Map<string, AdInsightMetrics>> {
  let last: Map<string, AdInsightMetrics> = new Map();
  for (const token of tokens) {
    if (!token) continue;
    const m = await fetchAdInsightsForCampaign(token, campaignId, opts);
    if (m.size) return m;
    last = m;
  }
  return last;
}

/**
 * Campanhas com gasto no período (fonte: snapshots do sync).
 * Usado para limitar chamadas Meta ao que importa no ranking.
 */
export async function getCampaignIdsWithSpendInPeriod(
  adAccountId: string,
  since: string,
  until: string,
  limit = 60
): Promise<string[]> {
  const sinceDay = since.slice(0, 10);
  const untilDay = until.slice(0, 10);
  const { campaignMetricSnapshot } = await repositories();
  const rows = await campaignMetricSnapshot
    .createQueryBuilder("s")
    .select("s.metaCampaignId", "metaCampaignId")
    .addSelect("SUM(s.spend::numeric)", "spend")
    .where("s.adAccountId = :id", { id: adAccountId })
    .andWhere("s.day >= :since", { since: sinceDay })
    .andWhere("s.day <= :until", { until: untilDay })
    .groupBy("s.metaCampaignId")
    .having("SUM(s.spend::numeric) > 0")
    .orderBy("spend", "DESC")
    .limit(limit)
    .getRawMany<{ metaCampaignId: string }>();
  return rows.map((r) => r.metaCampaignId).filter(Boolean);
}

/**
 * IDs de campanha sincronizadas no DB para uma conta (AdAccount.id), apenas as
 * com atividade RECENTE — campanhas paradas há semanas nao precisam ser
 * buscadas (o ranking so mostra campanha ativa). Reduz muito o fallback.
 */
export async function getSyncedCampaignIds(
  adAccountId: string,
  limit = 80,
  recentDaysOrSince?: number | string
): Promise<string[]> {
  const since =
    typeof recentDaysOrSince === "string"
      ? recentDaysOrSince.slice(0, 10)
      : new Date(Date.now() - (recentDaysOrSince ?? 21) * 86_400_000).toISOString().slice(0, 10);
  const { campaignMetricSnapshot } = await repositories();
  const rows = await campaignMetricSnapshot
    .createQueryBuilder("s")
    .select("DISTINCT s.metaCampaignId", "metaCampaignId")
    .where("s.adAccountId = :id", { id: adAccountId })
    .andWhere("s.day >= :since", { since })
    .limit(limit)
    .getRawMany<{ metaCampaignId: string }>();
  return rows.map((r) => r.metaCampaignId).filter(Boolean);
}

/** Executa `fn` sobre `items` com no máximo `limit` em paralelo (evita timeout). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

/**
 * Busca anúncios e insights por campanha (2 chamadas Meta por campanha).
 * Muito mais rápido que listar a conta inteira quando há poucas campanhas ativas.
 */
export async function loadAdsViaCampaigns(
  tokens: Array<string | null | undefined>,
  campaignIds: string[],
  opts?: { since?: string | null; until?: string | null; concurrency?: number }
): Promise<{ ads: AdUsageRow[]; insights: Map<string, AdInsightMetrics> }> {
  const insightOpts =
    opts?.since && opts?.until ? { since: opts.since, until: opts.until } : undefined;
  const concurrency = opts?.concurrency ?? 10;

  const results = await mapLimit(campaignIds, concurrency, async (cid) => {
    const { ads: cAds } = await fetchAdsForCampaignAnyToken(tokens, cid);
    if (!cAds.length) return { ads: [] as AdUsageRow[], insights: new Map<string, AdInsightMetrics>() };
    const cIns = await fetchInsightsForCampaignAnyToken(tokens, cid, insightOpts);
    return { ads: cAds, insights: cIns };
  });

  const ads: AdUsageRow[] = [];
  const insights = new Map<string, AdInsightMetrics>();
  for (const r of results) {
    ads.push(...r.ads);
    for (const [k, v] of r.insights) insights.set(k, v);
  }
  return { ads, insights };
}
