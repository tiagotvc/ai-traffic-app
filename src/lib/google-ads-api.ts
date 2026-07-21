import "server-only";

import { getGoogleAdsDeveloperToken, getGoogleAdsLoginCustomerId } from "@/lib/google-env";

/** Versão da Google Ads REST API. Bump aqui quando migrarmos de versão.
 *  O Google mantém só as ~3 versões mais recentes (o resto retorna 404). */
export const GOOGLE_ADS_API_VERSION = "v24";

export const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsCustomer = {
  /** ID numérico (só dígitos, sem hífens). */
  id: string;
  descriptiveName: string | null;
  currencyCode: string | null;
  timeZone: string | null;
  /** true = conta Manager (MCC), não veicula anúncios diretamente. */
  manager: boolean;
};

export type GoogleAdsCampaignMetrics = {
  campaignId: string;
  name: string;
  status: string;
  channelType: string;
  impressions: number;
  clicks: number;
  /** Custo na moeda da conta (cost_micros / 1e6). */
  cost: number;
  conversions: number;
  conversionsValue: number;
  /** Click-through rate como fração (0–1), como a API devolve. */
  ctr: number;
  /** CPC médio na moeda da conta (average_cpc micros / 1e6). */
  averageCpc: number;
};

/** Intervalos GAQL predefinidos aceitos (evita aritmética de data/timezone). */
const GAQL_DATE_RANGES = new Set([
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "LAST_MONTH",
  "THIS_WEEK_MON_TODAY",
  "THIS_WEEK_SUN_TODAY"
]);

export function normalizeGaqlDateRange(range?: string): string {
  const up = (range ?? "").trim().toUpperCase();
  return GAQL_DATE_RANGES.has(up) ? up : "LAST_30_DAYS";
}

export class GoogleAdsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.status = status;
  }
}

export function baseHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": getGoogleAdsDeveloperToken(),
    "content-type": "application/json"
  };
  const login = loginCustomerId?.replace(/\D/g, "") || getGoogleAdsLoginCustomerId();
  if (login) headers["login-customer-id"] = login;
  return headers;
}

export async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string; details?: unknown };
  } | null;
  return body?.error?.message ?? `Google Ads API error (${res.status})`;
}

/**
 * Lista os customer IDs que o token consegue acessar (contas próprias + via MCC).
 * Não exige login-customer-id. Retorna só os IDs numéricos.
 */
export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
    method: "GET",
    headers: baseHeaders(accessToken)
  });

  if (!res.ok) throw new GoogleAdsApiError(await parseError(res), res.status);

  const json = (await res.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? []).map((rn) => rn.replace("customers/", "").replace(/\D/g, ""));
}

/**
 * Detalhes de uma conta via GAQL (googleAds:search). Usa login-customer-id do MCC
 * quando configurado — necessário para acessar contas cliente sob a hierarquia.
 */
export async function getCustomerDetails(
  accessToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<GoogleAdsCustomer | null> {
  const cid = customerId.replace(/\D/g, "");
  const query =
    "SELECT customer.id, customer.descriptive_name, customer.currency_code, " +
    "customer.time_zone, customer.manager FROM customer LIMIT 1";

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers: baseHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query })
  });

  if (!res.ok) throw new GoogleAdsApiError(await parseError(res), res.status);

  const json = (await res.json()) as {
    results?: Array<{
      customer?: {
        id?: string;
        descriptiveName?: string;
        currencyCode?: string;
        timeZone?: string;
        manager?: boolean;
      };
    }>;
  };

  const c = json.results?.[0]?.customer;
  if (!c?.id) return null;

  return {
    id: String(c.id).replace(/\D/g, ""),
    descriptiveName: c.descriptiveName ?? null,
    currencyCode: c.currencyCode ?? null,
    timeZone: c.timeZone ?? null,
    manager: !!c.manager
  };
}

/**
 * Lista as contas acessíveis já com detalhes (nome, moeda, timezone). Best-effort:
 * cada conta é consultada tentando dois contextos de login-customer-id — primeiro
 * via MCC (contas sob a hierarquia do manager), depois como acesso direto
 * (login-customer-id = a própria conta). Só cai no fallback só-com-id se ambos
 * falharem (ex.: sem permissão de leitura).
 */
export async function listAccessibleCustomerDetails(
  accessToken: string
): Promise<GoogleAdsCustomer[]> {
  const ids = await listAccessibleCustomers(accessToken);
  const mcc = getGoogleAdsLoginCustomerId();

  const out = await Promise.all(
    ids.map(async (id) => {
      // Ordem: MCC (hierarquia) → self (acesso direto). Dedup evita chamada repetida
      // quando a conta é a própria MCC.
      const logins = [...new Set([mcc, id].filter(Boolean))];
      for (const login of logins) {
        try {
          const details = await getCustomerDetails(accessToken, id, login);
          if (details) return details;
        } catch {
          /* tenta o próximo contexto de login */
        }
      }
      return {
        id,
        descriptiveName: null,
        currencyCode: null,
        timeZone: null,
        manager: false
      } satisfies GoogleAdsCustomer;
    })
  );

  return out;
}

type SearchRow = Record<string, Record<string, unknown>>;

/**
 * Roda uma query GAQL num único contexto de login-customer-id, seguindo o
 * nextPageToken até esgotar as páginas.
 */
async function runGaqlSearch(
  accessToken: string,
  customerId: string,
  query: string,
  loginCustomerId: string
): Promise<SearchRow[]> {
  const rows: SearchRow[] = [];
  let pageToken: string | undefined;

  do {
    const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: baseHeaders(accessToken, loginCustomerId),
      body: JSON.stringify(pageToken ? { query, pageToken } : { query })
    });

    if (!res.ok) throw new GoogleAdsApiError(await parseError(res), res.status);

    const json = (await res.json()) as { results?: SearchRow[]; nextPageToken?: string };
    if (json.results?.length) rows.push(...json.results);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return rows;
}

const MICROS = 1_000_000;
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Métricas por campanha de uma conta, agregadas no intervalo (default LAST_30_DAYS).
 * Tenta login-customer-id = MCC → self, como `listAccessibleCustomerDetails`, para
 * cobrir contas dentro e fora da hierarquia da MCC.
 *
 * Só leitura (GoogleAdsService.Search) — funciona com o permissible use "Reporting".
 */
export async function getCampaignMetrics(
  accessToken: string,
  customerId: string,
  opts?: { dateRange?: string }
): Promise<GoogleAdsCampaignMetrics[]> {
  const cid = customerId.replace(/\D/g, "");
  const range = normalizeGaqlDateRange(opts?.dateRange);
  const query =
    "SELECT campaign.id, campaign.name, campaign.status, " +
    "campaign.advertising_channel_type, metrics.impressions, metrics.clicks, " +
    "metrics.cost_micros, metrics.conversions, metrics.conversions_value, " +
    "metrics.ctr, metrics.average_cpc " +
    `FROM campaign WHERE segments.date DURING ${range} ` +
    "ORDER BY metrics.cost_micros DESC";

  const mcc = getGoogleAdsLoginCustomerId();
  const logins = [...new Set([mcc, cid].filter(Boolean))];

  let lastErr: unknown;
  for (const login of logins) {
    try {
      const rows = await runGaqlSearch(accessToken, cid, query, login);
      return rows.map((row) => {
        const c = (row.campaign ?? {}) as Record<string, unknown>;
        const m = (row.metrics ?? {}) as Record<string, unknown>;
        return {
          campaignId: String(c.id ?? "").replace(/\D/g, ""),
          name: String(c.name ?? ""),
          status: String(c.status ?? ""),
          channelType: String(c.advertisingChannelType ?? ""),
          impressions: num(m.impressions),
          clicks: num(m.clicks),
          cost: num(m.costMicros) / MICROS,
          conversions: num(m.conversions),
          conversionsValue: num(m.conversionsValue),
          ctr: num(m.ctr),
          averageCpc: num(m.averageCpc) / MICROS
        } satisfies GoogleAdsCampaignMetrics;
      });
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new GoogleAdsApiError("Nenhum contexto de login válido para a conta", 400);
}

/** Dimensões de breakdown do Google Ads (algumas não existem no Meta). */
export type GoogleAdsBreakdownDimension = "device" | "gender" | "age" | "search_term" | "keyword";

export type GoogleAdsBreakdownRow = {
  label: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

type BreakdownConfig = {
  /** Campo GAQL selecionado (define a dimensão). */
  field: string;
  /** Resource GAQL (FROM). */
  from: string;
  /** true = ordena por custo e limita (dimensões de cardinalidade alta). */
  topN?: boolean;
  /** Extrai o rótulo da linha (REST camelCase). */
  label: (row: Record<string, Record<string, unknown>>) => string;
};

function pick(obj: unknown, path: string[]): string {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[k];
    else return "";
  }
  return cur == null ? "" : String(cur);
}

const BREAKDOWN_CONFIG: Record<GoogleAdsBreakdownDimension, BreakdownConfig> = {
  device: {
    field: "segments.device",
    from: "campaign",
    label: (r) => pick(r, ["segments", "device"])
  },
  gender: {
    field: "ad_group_criterion.gender.type",
    from: "gender_view",
    label: (r) => pick(r, ["adGroupCriterion", "gender", "type"])
  },
  age: {
    field: "ad_group_criterion.age_range.type",
    from: "age_range_view",
    label: (r) => pick(r, ["adGroupCriterion", "ageRange", "type"])
  },
  search_term: {
    field: "search_term_view.search_term",
    from: "search_term_view",
    topN: true,
    label: (r) => pick(r, ["searchTermView", "searchTerm"])
  },
  keyword: {
    field: "ad_group_criterion.keyword.text",
    from: "keyword_view",
    topN: true,
    label: (r) => pick(r, ["adGroupCriterion", "keyword", "text"])
  }
};

/**
 * Breakdown de uma dimensão do Google Ads, agregado por rótulo no intervalo.
 * Dimensões como termos de pesquisa/palavras-chave não têm equivalente no Meta.
 * Só leitura (funciona com o token "Reporting").
 */
export async function getBreakdown(
  accessToken: string,
  customerId: string,
  dimension: GoogleAdsBreakdownDimension,
  range: { since: string; until: string },
  opts?: { campaignId?: string }
): Promise<GoogleAdsBreakdownRow[]> {
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const cid = customerId.replace(/\D/g, "");
  const cfg = BREAKDOWN_CONFIG[dimension];
  const tail = cfg.topN ? " ORDER BY metrics.cost_micros DESC LIMIT 100" : "";
  const campaignFilter = opts?.campaignId
    ? ` AND campaign.id = ${opts.campaignId.replace(/\D/g, "")}`
    : "";
  const query =
    `SELECT ${cfg.field}, metrics.impressions, metrics.clicks, metrics.cost_micros, ` +
    `metrics.conversions FROM ${cfg.from} ` +
    `WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'${campaignFilter}${tail}`;

  const mcc = getGoogleAdsLoginCustomerId();
  const logins = [...new Set([mcc, cid].filter(Boolean))];

  let lastErr: unknown;
  for (const login of logins) {
    try {
      const rows = await runGaqlSearch(accessToken, cid, query, login);
      // Agrega por rótulo (várias linhas por campanha/grupo).
      const byLabel = new Map<string, GoogleAdsBreakdownRow>();
      for (const row of rows) {
        const label = cfg.label(row) || "—";
        const m = (row.metrics ?? {}) as Record<string, unknown>;
        let agg = byLabel.get(label);
        if (!agg) {
          agg = { label, impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: 0, averageCpc: 0 };
          byLabel.set(label, agg);
        }
        agg.impressions += num(m.impressions);
        agg.clicks += num(m.clicks);
        agg.cost += num(m.costMicros) / MICROS;
        agg.conversions += num(m.conversions);
      }
      return [...byLabel.values()]
        .map((r) => ({
          ...r,
          ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
          averageCpc: r.clicks > 0 ? r.cost / r.clicks : 0
        }))
        .sort((a, b) => b.cost - a.cost);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new GoogleAdsApiError("Nenhum contexto de login válido para a conta", 400);
}

/** Roda uma GAQL tentando login-customer-id = MCC → self e mapeia o resultado. */
async function queryWithLoginFallback<T>(
  accessToken: string,
  customerId: string,
  query: string,
  map: (rows: SearchRow[]) => T
): Promise<T> {
  const cid = customerId.replace(/\D/g, "");
  const mcc = getGoogleAdsLoginCustomerId();
  const logins = [...new Set([mcc, cid].filter(Boolean))];
  let lastErr: unknown;
  for (const login of logins) {
    try {
      return map(await runGaqlSearch(accessToken, cid, query, login));
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new GoogleAdsApiError("Nenhum contexto de login válido para a conta", 400);
}

export type GoogleAdsAdGroupRow = {
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

export type GoogleAdsAdRow = GoogleAdsAdGroupRow & { type: string };

const METRIC_SELECT =
  "metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions";

function accMetrics(agg: { impressions: number; clicks: number; cost: number; conversions: number }, m: Record<string, unknown>) {
  agg.impressions += num(m.impressions);
  agg.clicks += num(m.clicks);
  agg.cost += num(m.costMicros) / MICROS;
  agg.conversions += num(m.conversions);
}

function finalizeRow<T extends { impressions: number; clicks: number; cost: number; ctr: number; averageCpc: number }>(r: T): T {
  r.ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
  r.averageCpc = r.clicks > 0 ? r.cost / r.clicks : 0;
  return r;
}

/** Grupos de anúncios de uma campanha, agregados no intervalo. Só leitura. */
export async function getAdGroups(
  accessToken: string,
  customerId: string,
  campaignId: string,
  range: { since: string; until: string }
): Promise<GoogleAdsAdGroupRow[]> {
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const cmp = campaignId.replace(/\D/g, "");
  const query =
    `SELECT ad_group.id, ad_group.name, ad_group.status, ${METRIC_SELECT} ` +
    `FROM ad_group WHERE campaign.id = ${cmp} ` +
    `AND segments.date BETWEEN '${range.since}' AND '${range.until}'`;

  return queryWithLoginFallback(accessToken, customerId, query, (rows) => {
    const byId = new Map<string, GoogleAdsAdGroupRow>();
    for (const row of rows) {
      const ag = (row.adGroup ?? {}) as Record<string, unknown>;
      const id = String(ag.id ?? "").replace(/\D/g, "");
      if (!id) continue;
      let agg = byId.get(id);
      if (!agg) {
        agg = {
          id,
          name: String(ag.name ?? ""),
          status: String(ag.status ?? ""),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          averageCpc: 0
        };
        byId.set(id, agg);
      }
      accMetrics(agg, (row.metrics ?? {}) as Record<string, unknown>);
    }
    return [...byId.values()].map(finalizeRow).sort((a, b) => b.cost - a.cost);
  });
}

/** Anúncios de um grupo de anúncios, agregados no intervalo. Só leitura. */
export async function getAds(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  range: { since: string; until: string }
): Promise<GoogleAdsAdRow[]> {
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const ag = adGroupId.replace(/\D/g, "");
  const query =
    `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ` +
    `ad_group_ad.status, ${METRIC_SELECT} ` +
    `FROM ad_group_ad WHERE ad_group.id = ${ag} ` +
    `AND segments.date BETWEEN '${range.since}' AND '${range.until}'`;

  return queryWithLoginFallback(accessToken, customerId, query, (rows) => {
    const byId = new Map<string, GoogleAdsAdRow>();
    for (const row of rows) {
      const gaa = (row.adGroupAd ?? {}) as Record<string, unknown>;
      const ad = (gaa.ad ?? {}) as Record<string, unknown>;
      const id = String(ad.id ?? "").replace(/\D/g, "");
      if (!id) continue;
      let agg = byId.get(id);
      if (!agg) {
        agg = {
          id,
          name: String(ad.name ?? ""),
          type: String(ad.type ?? ""),
          status: String(gaa.status ?? ""),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          averageCpc: 0
        };
        byId.set(id, agg);
      }
      accMetrics(agg, (row.metrics ?? {}) as Record<string, unknown>);
    }
    return [...byId.values()].map(finalizeRow).sort((a, b) => b.cost - a.cost);
  });
}

// ---- Conteúdo do anúncio (Fase A) ----

export type GoogleAdsAdDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  finalUrls: string[];
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

/** Extrai `.text` de uma lista de AdTextAsset (headlines/descriptions). */
function textAssets(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((a) => (a && typeof a === "object" ? String((a as Record<string, unknown>).text ?? "") : ""))
    .filter(Boolean);
}

/**
 * Conteúdo de um anúncio (títulos, descrições, caminhos, URL final), normalizado
 * independente do tipo (RSA / texto expandido / display responsivo). Só leitura.
 */
export async function getAdDetail(
  accessToken: string,
  customerId: string,
  adId: string,
  range: { since: string; until: string }
): Promise<GoogleAdsAdDetail | null> {
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const id = adId.replace(/\D/g, "");
  const query =
    `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ` +
    `ad_group_ad.status, ad_group_ad.ad.final_urls, ` +
    `ad_group_ad.ad.responsive_search_ad.headlines, ` +
    `ad_group_ad.ad.responsive_search_ad.descriptions, ` +
    `ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2, ` +
    `ad_group_ad.ad.expanded_text_ad.headline_part1, ad_group_ad.ad.expanded_text_ad.headline_part2, ` +
    `ad_group_ad.ad.expanded_text_ad.headline_part3, ad_group_ad.ad.expanded_text_ad.description, ` +
    `ad_group_ad.ad.expanded_text_ad.description2, ad_group_ad.ad.expanded_text_ad.path1, ` +
    `ad_group_ad.ad.expanded_text_ad.path2, ad_group_ad.ad.responsive_display_ad.headlines, ` +
    `ad_group_ad.ad.responsive_display_ad.descriptions, ad_group_ad.ad.responsive_display_ad.long_headline, ` +
    `${METRIC_SELECT} ` +
    `FROM ad_group_ad WHERE ad_group_ad.ad.id = ${id} ` +
    `AND segments.date BETWEEN '${range.since}' AND '${range.until}'`;

  return queryWithLoginFallback(accessToken, customerId, query, (rows) => {
    if (!rows.length) return null;
    const agg = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
    for (const row of rows) accMetrics(agg, (row.metrics ?? {}) as Record<string, unknown>);

    const gaa = (rows[0].adGroupAd ?? {}) as Record<string, unknown>;
    const ad = (gaa.ad ?? {}) as Record<string, unknown>;
    const rsa = (ad.responsiveSearchAd ?? {}) as Record<string, unknown>;
    const eta = (ad.expandedTextAd ?? {}) as Record<string, unknown>;
    const rda = (ad.responsiveDisplayAd ?? {}) as Record<string, unknown>;

    let headlines = textAssets(rsa.headlines);
    let descriptions = textAssets(rsa.descriptions);
    let path1 = String(rsa.path1 ?? "");
    let path2 = String(rsa.path2 ?? "");

    if (!headlines.length && eta.headlinePart1) {
      headlines = [eta.headlinePart1, eta.headlinePart2, eta.headlinePart3]
        .map((x) => String(x ?? ""))
        .filter(Boolean);
      descriptions = [eta.description, eta.description2].map((x) => String(x ?? "")).filter(Boolean);
      path1 = String(eta.path1 ?? "");
      path2 = String(eta.path2 ?? "");
    }
    if (!headlines.length && (rda.headlines || rda.longHeadline)) {
      const long =
        rda.longHeadline && typeof rda.longHeadline === "object"
          ? String((rda.longHeadline as Record<string, unknown>).text ?? "")
          : "";
      headlines = [long, ...textAssets(rda.headlines)].filter(Boolean);
      descriptions = textAssets(rda.descriptions);
    }

    const finalUrls = Array.isArray(ad.finalUrls) ? (ad.finalUrls as unknown[]).map(String) : [];

    return finalizeRow({
      id: String(ad.id ?? id),
      name: String(ad.name ?? ""),
      type: String(ad.type ?? ""),
      status: String(gaa.status ?? ""),
      finalUrls,
      headlines,
      descriptions,
      path1,
      path2,
      impressions: agg.impressions,
      clicks: agg.clicks,
      cost: agg.cost,
      conversions: agg.conversions,
      ctr: 0,
      averageCpc: 0
    });
  });
}

// ---- Palavras-chave e termos de pesquisa (Fase B) ----

/** Escapa string para literal GAQL entre aspas simples. */
function escapeGaqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export type GoogleAdsKeywordRow = {
  text: string;
  matchType: string;
  status: string;
  criterionId: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

/** Palavras-chave (keyword_view), opcionalmente filtradas por campanha/grupo. Só leitura. */
export async function getKeywords(
  accessToken: string,
  customerId: string,
  opts: { campaignId?: string; adGroupId?: string; range: { since: string; until: string } }
): Promise<GoogleAdsKeywordRow[]> {
  const { range } = opts;
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const where = [`segments.date BETWEEN '${range.since}' AND '${range.until}'`];
  if (opts.campaignId) where.push(`campaign.id = ${opts.campaignId.replace(/\D/g, "")}`);
  if (opts.adGroupId) where.push(`ad_group.id = ${opts.adGroupId.replace(/\D/g, "")}`);
  const query =
    `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ` +
    `ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ` +
    `ad_group_criterion.keyword.match_type, ` +
    `ad_group_criterion.status, ${METRIC_SELECT} ` +
    `FROM keyword_view WHERE ${where.join(" AND ")} ORDER BY metrics.cost_micros DESC`;

  return queryWithLoginFallback(accessToken, customerId, query, (rows) => {
    const byKey = new Map<string, GoogleAdsKeywordRow>();
    for (const row of rows) {
      const c = (row.campaign ?? {}) as Record<string, unknown>;
      const g = (row.adGroup ?? {}) as Record<string, unknown>;
      const crit = (row.adGroupCriterion ?? {}) as Record<string, unknown>;
      const kw = (crit.keyword ?? {}) as Record<string, unknown>;
      const text = String(kw.text ?? "");
      if (!text) continue;
      const adGroupId = String(g.id ?? "").replace(/\D/g, "");
      const key = `${adGroupId}:${text}`;
      let agg = byKey.get(key);
      if (!agg) {
        agg = {
          text,
          matchType: String(kw.matchType ?? ""),
          status: String(crit.status ?? ""),
          criterionId: String(crit.criterionId ?? "").replace(/\D/g, ""),
          campaignId: String(c.id ?? "").replace(/\D/g, ""),
          campaignName: String(c.name ?? ""),
          adGroupId,
          adGroupName: String(g.name ?? ""),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          averageCpc: 0
        };
        byKey.set(key, agg);
      }
      accMetrics(agg, (row.metrics ?? {}) as Record<string, unknown>);
    }
    return [...byKey.values()].map(finalizeRow).sort((a, b) => b.cost - a.cost);
  });
}

export type GoogleAdsSearchTermRow = {
  searchTerm: string;
  status: string;
  triggeringKeyword: string;
  matchType: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

/**
 * Termos de pesquisa (search_term_view) com a palavra-chave que os ativou e o status
 * (ADDED/EXCLUDED/NONE). Filtráveis por campanha/grupo/keyword. Só leitura.
 */
export async function getSearchTerms(
  accessToken: string,
  customerId: string,
  opts: {
    campaignId?: string;
    adGroupId?: string;
    keyword?: string;
    range: { since: string; until: string };
  }
): Promise<GoogleAdsSearchTermRow[]> {
  const { range } = opts;
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const where = [`segments.date BETWEEN '${range.since}' AND '${range.until}'`];
  if (opts.campaignId) where.push(`campaign.id = ${opts.campaignId.replace(/\D/g, "")}`);
  if (opts.adGroupId) where.push(`ad_group.id = ${opts.adGroupId.replace(/\D/g, "")}`);
  if (opts.keyword) where.push(`segments.keyword.info.text = '${escapeGaqlString(opts.keyword)}'`);
  const query =
    `SELECT search_term_view.search_term, search_term_view.status, ` +
    `segments.keyword.info.text, segments.keyword.info.match_type, ` +
    `campaign.id, campaign.name, ad_group.id, ad_group.name, ${METRIC_SELECT} ` +
    `FROM search_term_view WHERE ${where.join(" AND ")} ` +
    `ORDER BY metrics.cost_micros DESC LIMIT 200`;

  return queryWithLoginFallback(accessToken, customerId, query, (rows) => {
    const byKey = new Map<string, GoogleAdsSearchTermRow>();
    for (const row of rows) {
      const stv = (row.searchTermView ?? {}) as Record<string, unknown>;
      const seg = (row.segments ?? {}) as Record<string, unknown>;
      const kwInfo = ((seg.keyword ?? {}) as Record<string, unknown>).info as
        | Record<string, unknown>
        | undefined;
      const c = (row.campaign ?? {}) as Record<string, unknown>;
      const g = (row.adGroup ?? {}) as Record<string, unknown>;
      const term = String(stv.searchTerm ?? "");
      if (!term) continue;
      const triggeringKeyword = String(kwInfo?.text ?? "");
      const key = `${term}:${triggeringKeyword}`;
      let agg = byKey.get(key);
      if (!agg) {
        agg = {
          searchTerm: term,
          status: String(stv.status ?? ""),
          triggeringKeyword,
          matchType: String(kwInfo?.matchType ?? ""),
          campaignId: String(c.id ?? "").replace(/\D/g, ""),
          campaignName: String(c.name ?? ""),
          adGroupId: String(g.id ?? "").replace(/\D/g, ""),
          adGroupName: String(g.name ?? ""),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          averageCpc: 0
        };
        byKey.set(key, agg);
      }
      accMetrics(agg, (row.metrics ?? {}) as Record<string, unknown>);
    }
    return [...byKey.values()].map(finalizeRow).sort((a, b) => b.cost - a.cost);
  });
}

export type GoogleAdsCampaignDailyMetrics = GoogleAdsCampaignMetrics & { date: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Métricas por campanha E por dia (segments.date) num intervalo — base dos
 * snapshots diários. `since`/`until` em 'YYYY-MM-DD'. Só leitura.
 */
export async function getCampaignMetricsDaily(
  accessToken: string,
  customerId: string,
  range: { since: string; until: string }
): Promise<GoogleAdsCampaignDailyMetrics[]> {
  if (!ISO_DATE.test(range.since) || !ISO_DATE.test(range.until)) {
    throw new GoogleAdsApiError("Datas inválidas (use YYYY-MM-DD)", 400);
  }
  const cid = customerId.replace(/\D/g, "");
  const query =
    "SELECT campaign.id, campaign.name, campaign.status, " +
    "campaign.advertising_channel_type, segments.date, metrics.impressions, " +
    "metrics.clicks, metrics.cost_micros, metrics.conversions, " +
    "metrics.conversions_value, metrics.ctr, metrics.average_cpc " +
    `FROM campaign WHERE segments.date BETWEEN '${range.since}' AND '${range.until}' ` +
    "ORDER BY segments.date";

  const mcc = getGoogleAdsLoginCustomerId();
  const logins = [...new Set([mcc, cid].filter(Boolean))];

  let lastErr: unknown;
  for (const login of logins) {
    try {
      const rows = await runGaqlSearch(accessToken, cid, query, login);
      return rows.map((row) => {
        const c = (row.campaign ?? {}) as Record<string, unknown>;
        const m = (row.metrics ?? {}) as Record<string, unknown>;
        const s = (row.segments ?? {}) as Record<string, unknown>;
        return {
          date: String(s.date ?? ""),
          campaignId: String(c.id ?? "").replace(/\D/g, ""),
          name: String(c.name ?? ""),
          status: String(c.status ?? ""),
          channelType: String(c.advertisingChannelType ?? ""),
          impressions: num(m.impressions),
          clicks: num(m.clicks),
          cost: num(m.costMicros) / MICROS,
          conversions: num(m.conversions),
          conversionsValue: num(m.conversionsValue),
          ctr: num(m.ctr),
          averageCpc: num(m.averageCpc) / MICROS
        } satisfies GoogleAdsCampaignDailyMetrics;
      });
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new GoogleAdsApiError("Nenhum contexto de login válido para a conta", 400);
}
