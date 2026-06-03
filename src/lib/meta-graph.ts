import { metaFetchWithRateLimit } from "@/lib/meta-rate-limit";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export type MetaAdAccount = {
  id: string;
  name?: string;
  /** Graph API: 1 = ACTIVE, 2 = DISABLED, etc. */
  account_status?: number;
  /** Business Manager dono da conta (quando o token tem business_management). */
  business?: { id: string; name?: string } | null;
};

export type MetaPixel = {
  id: string;
  name?: string;
};

export type MetaFacebookPage = {
  id: string;
  name?: string;
};

export type MetaBusinessRef = {
  id: string;
  name?: string;
};

export type MetaBusinessUser = {
  id: string;
  role?: string;
  business?: MetaBusinessRef;
};

export type MetaCustomAudience = {
  id: string;
  name?: string;
  subtype?: string;
  approximate_count?: number;
  lookalike_spec?: unknown;
};

export type MetaInsightRow = {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ value: string }>;
  /** Meta Ads Manager "Resultados" — objective-aligned outcomes */
  results?: Array<{ indicator?: string; values?: Array<{ value: string }> }> | string;
};

export type MetaCampaignInsightRow = MetaInsightRow & {
  campaign_id?: string;
  campaign_name?: string;
};

export type MetaAdImage = { id: string; hash?: string; name?: string; url?: string };

export type MetaCampaign = {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
};

export type MetaAdSet = {
  id: string;
  name?: string;
  status?: string;
  daily_budget?: string;
  campaign_id?: string;
};

export type MetaAd = {
  id: string;
  name?: string;
  status?: string;
  adset_id?: string;
};

async function metaFetch<T>(path: string, accessToken: string): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  const { data } = await metaFetchWithRateLimit<T>(url.toString());
  return data;
}

export async function metaPost<T>(path: string, accessToken: string, body: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  const { data } = await metaFetchWithRateLimit<T>(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString()
  });
  return data;
}

export async function fetchMyBusinesses(accessToken: string): Promise<MetaAdAccount[]> {
  return fetchGraphPaged<MetaAdAccount>("/me/businesses?fields=id,name&limit=100", accessToken);
}

export type MetaPermission = { permission: string; status: "granted" | "declined" | string };

/** Lista permissões concedidas/recusadas do token (/me/permissions). */
export async function fetchMyPermissions(accessToken: string): Promise<MetaPermission[]> {
  return fetchGraphPaged<MetaPermission>("/me/permissions?limit=100", accessToken);
}

export async function fetchMyBusinessUsers(accessToken: string): Promise<MetaBusinessUser[]> {
  return fetchGraphPaged<MetaBusinessUser>(
    "/me/business_users?fields=id,role,business{id,name}&limit=100",
    accessToken
  );
}

export async function fetchBusinessUserAssignedAdAccounts(
  accessToken: string,
  businessUserId: string
): Promise<MetaAdAccount[]> {
  try {
    return fetchGraphPaged<MetaAdAccount>(
      `/${encodeURIComponent(businessUserId)}/assigned_ad_accounts?fields=id,name,account_status&limit=100`,
      accessToken
    );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[meta-graph] assigned_ad_accounts for ${businessUserId}:`, err);
    }
    return [];
  }
}

const GRAPH_EDGE_MAX_ITEMS = 500;

type GraphPaged<T> = { data?: T[]; paging?: { next?: string } };

function graphUrlWithToken(pathOrUrl: string, accessToken: string): string {
  if (!accessToken?.trim()) {
    throw new Error("Meta access token is required");
  }

  const url = pathOrUrl.startsWith("http")
    ? new URL(pathOrUrl)
    : new URL(`${GRAPH_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`);

  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

async function fetchGraphPaged<T>(
  firstUrl: string,
  accessToken: string,
  maxItems = GRAPH_EDGE_MAX_ITEMS
): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = firstUrl;

  while (url && out.length < maxItems) {
    const page: GraphPaged<T> = (
      await metaFetchWithRateLimit<GraphPaged<T>>(graphUrlWithToken(url, accessToken))
    ).data;

    const batch = page.data ?? [];
    out.push(...batch);
    url = page.paging?.next ?? null;
    if (!batch.length) break;
  }

  return out.slice(0, maxItems);
}

function mergeById<T extends { id: string; name?: string }>(lists: T[][]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: "base" })
  );
}

async function fetchBusinessEdge<T extends { id: string; name?: string }>(
  accessToken: string,
  businessId: string,
  edge: "owned_ad_accounts" | "client_ad_accounts" | "owned_pages" | "client_pages",
  fields = "id,name"
): Promise<T[]> {
  try {
    const path = `/${encodeURIComponent(businessId)}/${edge}?fields=${encodeURIComponent(fields)}&limit=100`;
    return fetchGraphPaged<T>(path, accessToken);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[meta-graph] ${edge} for ${businessId}:`, err);
    }
    return [];
  }
}

export async function fetchBusinessAdAccounts(
  accessToken: string,
  businessId: string
): Promise<MetaAdAccount[]> {
  const fields = "id,name,account_status";
  const [owned, client] = await Promise.all([
    fetchBusinessEdge<MetaAdAccount>(accessToken, businessId, "owned_ad_accounts", fields),
    fetchBusinessEdge<MetaAdAccount>(accessToken, businessId, "client_ad_accounts", fields)
  ]);
  return mergeById([owned, client]);
}

export type AccessibleAdAccount = MetaAdAccount & {
  metaBusinessId: string | null;
  metaBusinessName: string | null;
};

/** Une /me/adaccounts, contas do BM (owned+client) e assigned_ad_accounts do usuário no BM. */
export async function fetchAllAccessibleAdAccounts(
  accessToken: string
): Promise<Map<string, AccessibleAdAccount>> {
  const map = new Map<string, AccessibleAdAccount>();

  const add = (
    acc: MetaAdAccount,
    metaBusinessId: string | null,
    metaBusinessName: string | null = null
  ) => {
    const prev = map.get(acc.id);
    map.set(acc.id, {
      ...acc,
      name: acc.name ?? prev?.name,
      account_status: acc.account_status ?? prev?.account_status,
      metaBusinessId: metaBusinessId ?? prev?.metaBusinessId ?? null,
      metaBusinessName: metaBusinessName ?? prev?.metaBusinessName ?? null
    });
  };

  // /me/adaccounts já traz o BM dono em acc.business — usar para não cair em "Sem BM".
  for (const acc of await fetchMyAdAccounts(accessToken)) {
    add(acc, acc.business?.id ?? null, acc.business?.name ?? null);
  }

  for (const bu of await fetchMyBusinessUsers(accessToken)) {
    const bmId = bu.business?.id ?? null;
    const bmName = bu.business?.name ?? null;
    const assigned = await fetchBusinessUserAssignedAdAccounts(accessToken, bu.id);
    for (const acc of assigned) add(acc, bmId, bmName);
  }

  for (const bm of await fetchMyBusinesses(accessToken)) {
    const accounts = await fetchBusinessAdAccounts(accessToken, bm.id);
    for (const acc of accounts) add(acc, bm.id, bm.name ?? null);
  }

  return map;
}

export async function fetchBusinessPages(
  accessToken: string,
  businessId: string
): Promise<MetaFacebookPage[]> {
  const [owned, client] = await Promise.all([
    fetchBusinessEdge<MetaFacebookPage>(accessToken, businessId, "owned_pages"),
    fetchBusinessEdge<MetaFacebookPage>(accessToken, businessId, "client_pages")
  ]);
  return mergeById([owned, client]);
}

export async function fetchMyAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const first = `/me/adaccounts?fields=id,name,account_status,business{id,name}&limit=100`;
  return fetchGraphPaged<MetaAdAccount>(first, accessToken);
}

export async function fetchAdAccountPixels(
  accessToken: string,
  adAccountId: string
): Promise<MetaPixel[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  try {
    const first = `/${encodeURIComponent(act)}/adspixels?fields=id,name&limit=100`;
    return fetchGraphPaged<MetaPixel>(first, accessToken);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[meta-graph] adspixels for ${act}:`, err);
    }
    return [];
  }
}

export async function fetchUserPages(accessToken: string): Promise<MetaFacebookPage[]> {
  return fetchGraphPaged<MetaFacebookPage>("/me/accounts?fields=id,name&limit=100", accessToken);
}

export async function fetchCustomAudiences(
  accessToken: string,
  adAccountId: string
): Promise<MetaCustomAudience[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const fields = ["id", "name", "subtype", "approximate_count", "lookalike_spec"].join(",");
  const data = await metaFetch<{ data: MetaCustomAudience[] }>(
    `/${encodeURIComponent(act)}/customaudiences?fields=${encodeURIComponent(fields)}&limit=100`,
    accessToken
  );
  return data.data ?? [];
}

export async function createLookalikeAudience(
  accessToken: string,
  adAccountId: string,
  input: {
    name: string;
    originAudienceId: string;
    ratio: number;
    country: string;
  }
): Promise<{ id: string }> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  return metaPost(`/${encodeURIComponent(act)}/customaudiences`, accessToken, {
    name: input.name,
    subtype: "LOOKALIKE",
    origin_audience_id: input.originAudienceId,
    lookalike_spec: JSON.stringify({
      type: "similarity",
      ratio: input.ratio,
      country: input.country
    })
  });
}

export async function uploadAdImage(
  accessToken: string,
  adAccountId: string,
  imageUrl: string,
  name: string
): Promise<{ images: Record<string, { hash: string }> }> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  return metaPost(`/${encodeURIComponent(act)}/adimages`, accessToken, {
    url: imageUrl,
    name
  });
}

const INSIGHT_METRIC_FIELDS = [
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "reach",
  "actions",
  "results",
  "purchase_roas",
  "date_start"
];

export async function fetchAccountInsightsDaily(accessToken: string, adAccountId: string): Promise<MetaInsightRow[]> {
  const fields = INSIGHT_METRIC_FIELDS.join(",");
  const path = `/${encodeURIComponent(adAccountId)}/insights?fields=${encodeURIComponent(fields)}&time_increment=1&date_preset=last_30d`;
  const data = await metaFetch<{ data: MetaInsightRow[] }>(path, accessToken);
  return data.data ?? [];
}

export async function fetchCampaignInsightsDaily(
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaignInsightRow[]> {
  const fields = ["campaign_id", "campaign_name", ...INSIGHT_METRIC_FIELDS].join(",");
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=campaign&fields=${encodeURIComponent(fields)}&time_increment=1&date_preset=last_30d`;
  const data = await metaFetch<{ data: MetaCampaignInsightRow[] }>(path, accessToken);
  return data.data ?? [];
}

export async function fetchCampaignInsightsForRange(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
): Promise<MetaCampaignInsightRow[]> {
  const fields = ["campaign_id", "campaign_name", ...INSIGHT_METRIC_FIELDS.filter((f) => f !== "date_start")].join(
    ","
  );
  const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=campaign&fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}`;
  const data = await metaFetch<{ data: MetaCampaignInsightRow[] }>(path, accessToken);
  return data.data ?? [];
}

export async function fetchCampaignInsightForRange(
  accessToken: string,
  metaCampaignId: string,
  since: string,
  until: string
): Promise<MetaCampaignInsightRow | null> {
  const fields = [...INSIGHT_METRIC_FIELDS.filter((f) => f !== "date_start")].join(",");
  const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
  const path = `/${encodeURIComponent(metaCampaignId)}/insights?fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}`;
  const data = await metaFetch<{ data: MetaCampaignInsightRow[] }>(path, accessToken);
  return data.data?.[0] ?? null;
}

export async function fetchCampaignInsightsDailyForCampaign(
  accessToken: string,
  metaCampaignId: string,
  since: string,
  until: string
): Promise<MetaCampaignInsightRow[]> {
  const fields = [...INSIGHT_METRIC_FIELDS].join(",");
  const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
  const path = `/${encodeURIComponent(metaCampaignId)}/insights?fields=${encodeURIComponent(fields)}&time_increment=1&time_range=${encodeURIComponent(timeRange)}`;
  const data = await metaFetch<{ data: MetaCampaignInsightRow[] }>(path, accessToken);
  return data.data ?? [];
}

export async function fetchAdImages(accessToken: string, adAccountId: string): Promise<MetaAdImage[]> {
  const fields = ["id", "hash", "name", "url"].join(",");
  const path = `/${encodeURIComponent(adAccountId)}/adimages?fields=${encodeURIComponent(fields)}&limit=50`;
  const data = await metaFetch<{ data: MetaAdImage[] }>(path, accessToken);
  return data.data ?? [];
}

const LEAD_ACTIONS = new Set([
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "offsite_conversion.lead"
]);

const CONVERSION_ACTIONS = new Set([
  ...LEAD_ACTIONS,
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "complete_registration",
  "submit_application",
  "contact",
  "subscribe"
]);

/** Indicators Meta returns in the `results` array — exclude clicks, views, etc. */
const RESULT_INDICATOR_PATTERNS = [
  /lead/i,
  /purchase/i,
  /offsite_conversion/i,
  /onsite_conversion/i,
  /complete_registration/i,
  /submit_application/i,
  /subscribe/i,
  /contact/i,
  /app_install/i,
  /messaging/i
];

function isResultIndicator(indicator: string) {
  return RESULT_INDICATOR_PATTERNS.some((rx) => rx.test(indicator));
}

function firstIndicatorValue(values?: Array<{ value: string }>) {
  const n = Number(values?.[0]?.value);
  return Number.isFinite(n) ? n : 0;
}

function pickResultsFromArray(
  raw: Array<{ indicator?: string; values?: Array<{ value: string }> }>
): number {
  let best = 0;
  for (const entry of raw) {
    const indicator = entry.indicator ?? "";
    const val = firstIndicatorValue(entry.values);
    if (val <= 0 || !isResultIndicator(indicator)) continue;
    if (val > best) best = val;
  }
  return best;
}

export function pickLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions?.length) return 0;
  let sum = 0;
  for (const a of actions) {
    if (LEAD_ACTIONS.has(a.action_type)) sum += Number(a.value) || 0;
  }
  return sum;
}

export function pickResults(row: Pick<MetaInsightRow, "results" | "actions">): number {
  const raw = row.results;
  if (raw != null) {
    if (typeof raw === "string" || typeof raw === "number") {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    if (Array.isArray(raw) && raw.length) {
      const fromArray = pickResultsFromArray(raw);
      if (fromArray > 0) return fromArray;
    }
  }
  return pickConversions(row.actions);
}

export function pickConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions?.length) return 0;
  let sum = 0;
  for (const a of actions) {
    if (CONVERSION_ACTIONS.has(a.action_type)) {
      sum += Number(a.value) || 0;
      continue;
    }
    const type = a.action_type;
    if (
      type.includes("lead") ||
      type.includes("purchase") ||
      type.includes("complete_registration") ||
      type.includes("submit_application")
    ) {
      sum += Number(a.value) || 0;
    }
  }
  return sum;
}

export async function fetchCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const fields = ["id", "name", "status", "objective", "daily_budget"].join(",");
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const first = `/${encodeURIComponent(act)}/campaigns?fields=${encodeURIComponent(fields)}&limit=100`;
  return fetchGraphPaged<MetaCampaign>(first, accessToken);
}

export async function fetchCampaign(accessToken: string, campaignId: string): Promise<MetaCampaign> {
  const fields = ["id", "name", "status", "objective", "daily_budget"].join(",");
  return metaFetch<MetaCampaign>(`/${encodeURIComponent(campaignId)}?fields=${encodeURIComponent(fields)}`, accessToken);
}

export async function fetchAdSetsForCampaign(
  accessToken: string,
  campaignId: string
): Promise<MetaAdSet[]> {
  const fields = ["id", "name", "status", "daily_budget", "campaign_id"].join(",");
  const first = `/${encodeURIComponent(campaignId)}/adsets?fields=${encodeURIComponent(fields)}&limit=100`;
  return fetchGraphPaged<MetaAdSet>(first, accessToken);
}

export async function fetchAdsForAdSet(accessToken: string, adSetId: string): Promise<MetaAd[]> {
  const fields = ["id", "name", "status", "adset_id"].join(",");
  const path = `/${encodeURIComponent(adSetId)}/ads?fields=${encodeURIComponent(fields)}&limit=50`;
  const data = await metaFetch<{ data: MetaAd[] }>(path, accessToken);
  return data.data ?? [];
}

export type MetaAdSetInsight = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  reach: number;
  conversions: number;
  roas: number;
};

export async function fetchAdSetInsights(
  accessToken: string,
  adSetId: string,
  since?: string,
  until?: string
): Promise<MetaAdSetInsight | null> {
  try {
    const fields = ["spend", "impressions", "clicks", "ctr", "reach", "actions", "results", "purchase_roas"].join(
      ","
    );
    let path = `/${encodeURIComponent(adSetId)}/insights?fields=${encodeURIComponent(fields)}`;
    if (since && until) {
      const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
      path += `&time_range=${encodeURIComponent(timeRange)}`;
    } else {
      path += "&date_preset=last_7d";
    }
    const data = await metaFetch<{ data: MetaInsightRow[] }>(path, accessToken);
    const row = data.data?.[0];
    if (!row) return null;
    const spend = Number(row.spend) || 0;
    const conversions = pickResults(row);
    const roasRaw = row.purchase_roas?.[0]?.value;
    const roas = roasRaw != null ? Number(roasRaw) : spend > 0 && conversions > 0 ? spend / conversions : 0;
    return {
      spend,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      ctr: Number(row.ctr) || 0,
      reach: Number(row.reach) || 0,
      conversions,
      roas: Number.isFinite(roas) ? roas : 0
    };
  } catch {
    return null;
  }
}

export async function updateEntityStatus(
  accessToken: string,
  entityId: string,
  status: "ACTIVE" | "PAUSED"
) {
  return metaPost(`/${encodeURIComponent(entityId)}`, accessToken, { status });
}

export async function pauseAd(accessToken: string, adId: string) {
  return updateEntityStatus(accessToken, adId, "PAUSED");
}

export async function activateAd(accessToken: string, adId: string) {
  return updateEntityStatus(accessToken, adId, "ACTIVE");
}

export async function pauseCampaign(accessToken: string, campaignId: string) {
  return updateEntityStatus(accessToken, campaignId, "PAUSED");
}

export async function activateCampaign(accessToken: string, campaignId: string) {
  return updateEntityStatus(accessToken, campaignId, "ACTIVE");
}

export async function pauseAdSet(accessToken: string, adSetId: string) {
  return updateEntityStatus(accessToken, adSetId, "PAUSED");
}

export async function activateAdSet(accessToken: string, adSetId: string) {
  return updateEntityStatus(accessToken, adSetId, "ACTIVE");
}

export async function updateCampaignDailyBudget(
  accessToken: string,
  campaignId: string,
  dailyBudgetMinorUnits: number
) {
  return metaPost(`/${encodeURIComponent(campaignId)}`, accessToken, {
    daily_budget: String(Math.max(0, Math.round(dailyBudgetMinorUnits)))
  });
}

export async function updateAdSetDailyBudget(
  accessToken: string,
  adSetId: string,
  dailyBudgetMinorUnits: number
) {
  return metaPost(`/${encodeURIComponent(adSetId)}`, accessToken, {
    daily_budget: String(Math.max(0, Math.round(dailyBudgetMinorUnits)))
  });
}

export async function renameEntity(accessToken: string, entityId: string, name: string) {
  return metaPost(`/${encodeURIComponent(entityId)}`, accessToken, { name });
}
