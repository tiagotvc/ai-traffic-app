import "server-only";

import type { AdAccount } from "@/db/entities/AdAccount";
import {
  fetchAdsForAccountAnyToken,
  fetchInsightsForAccountAnyToken,
  getCampaignIdsWithSpendInPeriod,
  getSyncedCampaignIds,
  loadAdsViaCampaigns,
  probeAdAccountAccessAnyToken
} from "@/lib/creatives-data";
import {
  getCachedAccountCreatives,
  setCachedAccountCreatives,
  type CachedAccountCreatives
} from "@/lib/creatives-cache";
import type { AdInsightMetrics, AdUsageRow } from "@/lib/meta-graph";

import type {
  CreativeAccessSuggestedAction,
  CreativeAccessWarning,
  CreativeAccessWarningCode
} from "@/lib/creatives-access-types";
import { mapLimit } from "@/lib/concurrency";

const ACCOUNT_LEVEL_CAMPAIGN_THRESHOLD = 8;
const ACCOUNT_FETCH_CONCURRENCY = 3;

export type { CreativeAccessWarning, CreativeAccessWarningCode, CreativeAccessSuggestedAction };

export type AccountCreativesFetchResult = {
  acc: AdAccount;
  ads: AdUsageRow[];
  insights: Map<string, AdInsightMetrics>;
  ok: boolean;
  fromCache: boolean;
  warning: CreativeAccessWarning | null;
  diag?: Record<string, unknown>;
};

function classifyAccessError(reason: string | null | undefined): {
  code: CreativeAccessWarningCode;
  suggestedAction: CreativeAccessSuggestedAction;
  needsReconnect: boolean;
} {
  const r = reason ?? "";
  const lower = r.toLowerCase();

  if (!r) {
    return { code: "NO_TOKEN", suggestedAction: "invite_colleague", needsReconnect: false };
  }
  if (/expired|session has expired|error validating access token|190/i.test(r)) {
    return { code: "TOKEN_EXPIRED", suggestedAction: "reconnect_meta", needsReconnect: true };
  }
  if (/rate limit|request limit|#4\)|#17\)|#32\)|#613\)/i.test(r)) {
    return { code: "RATE_LIMIT", suggestedAction: "retry_later", needsReconnect: false };
  }
  if (/#200|ads_management|ads_read|permission|not granted|does not exist/i.test(lower)) {
    return {
      code: "ACCOUNT_NOT_GRANTED",
      suggestedAction: "reconnect_meta",
      needsReconnect: true
    };
  }
  return { code: "UNKNOWN", suggestedAction: "reconnect_meta", needsReconnect: true };
}

function buildWarning(
  acc: AdAccount,
  reason: string | null,
  extra?: Partial<CreativeAccessWarning>
): CreativeAccessWarning {
  const classified = classifyAccessError(reason);
  return {
    account: acc.metaAdAccountId,
    label: acc.label ?? acc.metaAdAccountId,
    needsReconnect: classified.needsReconnect,
    reason,
    code: classified.code,
    suggestedAction: classified.suggestedAction,
    ...extra
  };
}

export type FetchAccountCreativesOpts = {
  tokens: string[];
  since?: string | null;
  until?: string | null;
  tenantId: string;
  clientId: string;
  skipCache?: boolean;
  debug?: boolean;
  /** Limita a campanhas específicas (ex.: filtro na UI). */
  campaignMetaIds?: string[];
};

async function resolveCampaignIdsForFetch(
  acc: AdAccount,
  since: string | null | undefined,
  until: string | null | undefined,
  campaignMetaIds?: string[]
): Promise<string[]> {
  if (campaignMetaIds?.length) {
    return [...new Set(campaignMetaIds)];
  }
  if (since && until) {
    const withSpend = await getCampaignIdsWithSpendInPeriod(acc.id, since, until);
    if (withSpend.length) return withSpend;
    return getSyncedCampaignIds(acc.id, 40, since);
  }
  return getSyncedCampaignIds(acc.id);
}

/** Busca ads + insights: campanhas com gasto no período (DB) → Meta por campanha. */
export async function fetchAccountCreatives(
  acc: AdAccount,
  opts: FetchAccountCreativesOpts
): Promise<AccountCreativesFetchResult> {
  const { tokens, since, until, tenantId, clientId, skipCache, debug, campaignMetaIds } = opts;
  const t0 = Date.now();

  if (!tokens.length) {
    return {
      acc,
      ads: [],
      insights: new Map(),
      ok: false,
      fromCache: false,
      warning: buildWarning(acc, "Nenhum token Meta no workspace"),
      diag: debug
        ? { account: acc.metaAdAccountId, ok: false, fromCache: false, tokenErrors: 0 }
        : undefined
    };
  }

  if (!skipCache && since && until) {
    const cached = getCachedAccountCreatives(
      tenantId,
      clientId,
      acc.metaAdAccountId,
      since,
      until
    );
    if (cached) {
      return {
        acc,
        ads: cached.ads,
        insights: new Map(Object.entries(cached.insights)),
        ok: true,
        fromCache: true,
        warning: null,
        diag: debug
          ? {
              account: acc.metaAdAccountId,
              ok: true,
              fromCache: true,
              adsTotal: cached.ads.length,
              insightsRows: Object.keys(cached.insights).length,
              totalMs: Date.now() - t0
            }
          : undefined
      };
    }
  }

  const probe = await probeAdAccountAccessAnyToken(tokens, acc.metaAdAccountId);
  const tAfterProbe = Date.now();
  let ads: AdUsageRow[] = [];
  let insights = new Map<string, AdInsightMetrics>();
  let ok = false;
  let resolvedViaFallback = false;
  let scopedViaCampaigns = false;
  let lastError: string | null = probe.reason;
  let tokenErrors = 0;
  const timings: Record<string, number> = { probeMs: tAfterProbe - t0 };

  const tResolve = Date.now();
  const campaignIds = await resolveCampaignIdsForFetch(acc, since, until, campaignMetaIds);
  timings.resolveCampaignIdsMs = Date.now() - tResolve;
  timings.campaignCount = campaignIds.length;

  const preferAccountLevel =
    probe.ok && campaignIds.length > ACCOUNT_LEVEL_CAMPAIGN_THRESHOLD && !campaignMetaIds?.length;

  if (preferAccountLevel) {
    const tAds = Date.now();
    const accRes = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    timings.fetchAdsMs = Date.now() - tAds;
    tokenErrors = accRes.errors;
    lastError = accRes.lastError ?? null;
    if (accRes.ok) {
      ads = accRes.ads;
      ok = true;
      if (ads.length) {
        const tIns = Date.now();
        insights = await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
          since,
          until
        });
        timings.fetchInsightsMs = Date.now() - tIns;
      }
    }
  }

  if (!ok && campaignIds.length) {
    const tLoad = Date.now();
    const scoped = await loadAdsViaCampaigns(tokens, campaignIds, { since, until });
    timings.loadViaCampaignsMs = Date.now() - tLoad;
    if (scoped.ads.length) {
      ads = scoped.ads;
      insights = scoped.insights;
      ok = true;
      scopedViaCampaigns = true;
      lastError = null;
    }
  }

  if (!ok && probe.ok && campaignIds.length === 0) {
    const tAds = Date.now();
    const accRes = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    timings.fetchAdsMs = Date.now() - tAds;
    tokenErrors = accRes.errors;
    lastError = accRes.lastError ?? null;
    if (accRes.ok) {
      ads = accRes.ads;
      ok = true;
      if (ads.length) {
        const tIns = Date.now();
        insights = await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
          since,
          until
        });
        timings.fetchInsightsMs = Date.now() - tIns;
      }
    }
  }

  const permissionError = (msg: string | null) =>
    /#200|ads_management|ads_read|permission/i.test(msg ?? "");

  if (!ok && permissionError(lastError ?? probe.reason)) {
    const tFb = Date.now();
    const fallbackIds =
      campaignIds.length > 0
        ? campaignIds
        : since
          ? await getSyncedCampaignIds(acc.id, 40, since)
          : await getSyncedCampaignIds(acc.id);
    timings.syncedCampaignIdsMs = Date.now() - tFb;
    if (fallbackIds.length) {
      const tLoad = Date.now();
      const fallback = await loadAdsViaCampaigns(tokens, fallbackIds, { since, until });
      timings.fallbackViaCampaignsMs = Date.now() - tLoad;
      timings.fallbackCampaignCount = fallbackIds.length;
      if (fallback.ads.length) {
        ads = fallback.ads;
        insights = fallback.insights;
        ok = true;
        resolvedViaFallback = true;
        scopedViaCampaigns = true;
        lastError = null;
      }
    }
  }

  if (!ok && probe.ok) {
    const tAds = Date.now();
    const accRes = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    timings.fallbackAccountLevelMs = Date.now() - tAds;
    tokenErrors = accRes.errors;
    lastError = accRes.lastError ?? probe.reason ?? null;
    if (accRes.ok) {
      ads = accRes.ads;
      ok = true;
      resolvedViaFallback = true;
      if (ads.length) {
        insights = await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
          since,
          until
        });
      }
    }
  } else if (!probe.ok && !ok && !scopedViaCampaigns) {
    const accRes = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    tokenErrors = accRes.errors;
    lastError = accRes.lastError ?? probe.reason ?? null;
    if (accRes.ok) {
      ads = accRes.ads;
      ok = true;
      if (ads.length) {
        insights = await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
          since,
          until
        });
      }
    }
  }

  if (ok && since && until) {
    const payload: CachedAccountCreatives = {
      ads,
      insights: Object.fromEntries(insights)
    };
    setCachedAccountCreatives(tenantId, clientId, acc.metaAdAccountId, since, until, payload);
  }

  const warning =
    ok && !resolvedViaFallback
      ? null
      : ok && resolvedViaFallback
        ? null
        : buildWarning(acc, lastError);

  return {
    acc,
    ads,
    insights,
    ok,
    fromCache: false,
    warning,
    diag: debug
      ? {
          account: acc.metaAdAccountId,
          label: acc.label ?? null,
          ok,
          resolvedViaFallback,
          scopedViaCampaigns,
          fromCache: false,
          tokenErrors,
          accountError: lastError,
          adsTotal: ads.length,
          adsActiveCampaign: ads.filter((a) => a.campaignStatus === "ACTIVE").length,
          insightsRows: insights.size,
          totalMs: Date.now() - t0,
          timings
        }
      : undefined
  };
}

export async function fetchAllAccountCreatives(
  accounts: AdAccount[],
  opts: FetchAccountCreativesOpts
): Promise<{
  results: AccountCreativesFetchResult[];
  warnings: CreativeAccessWarning[];
  partialData: boolean;
  dataSource: "cached" | "live" | "mixed";
  cacheHits: number;
}> {
  const results = await mapLimit(accounts, ACCOUNT_FETCH_CONCURRENCY, (acc) =>
    fetchAccountCreatives(acc, opts)
  );

  const warnings: CreativeAccessWarning[] = [];
  for (const r of results) {
    if (r.warning) warnings.push(r.warning);
  }

  const okCount = results.filter((r) => r.ok).length;
  const partialData = okCount > 0 && warnings.length > 0;

  const cachedCount = results.filter((r) => r.fromCache).length;
  const cacheHits = results.filter((r) => r.fromCache).length;
  const dataSource: "cached" | "live" | "mixed" =
    cachedCount === results.length
      ? "cached"
      : cachedCount === 0
        ? "live"
        : "mixed";

  return { results, warnings, partialData, dataSource, cacheHits };
}
