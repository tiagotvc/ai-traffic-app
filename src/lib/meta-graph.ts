import { metaFetchWithRateLimit } from "@/lib/meta-rate-limit";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export type MetaAdAccount = {
  id: string;
  name?: string;
  /** Graph API: 1 = ACTIVE, 2 = DISABLED, etc. */
  account_status?: number;
  /** IANA tz configurado na conta (ex.: America/Sao_Paulo). */
  timezone_name?: string;
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
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
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

export type MetaAdsetInsightRow = MetaInsightRow & {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
};

export type MetaAdImage = { id: string; hash?: string; name?: string; url?: string };
export type MetaAdVideo = { id: string; title?: string; picture?: string; source?: string };

export type MetaCampaign = {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  buying_type?: string;
};

export type MetaAdSet = {
  id: string;
  name?: string;
  status?: string;
  daily_budget?: string;
  campaign_id?: string;
};

export type MetaAdCreative = {
  id?: string;
  name?: string;
  thumbnail_url?: string;
  object_story_spec?: Record<string, unknown>;
  asset_feed_spec?: Record<string, unknown>;
};

export type MetaAd = {
  id: string;
  name?: string;
  status?: string;
  adset_id?: string;
  creative?: MetaAdCreative | string;
};

export type CreativeAssetType = "image" | "video" | "carousel" | "copy" | "headline" | "description";

export type ResolvedAdCreative = {
  id: string;
  name?: string;
  thumbnailUrl?: string;
  imageHash?: string;
  type: CreativeAssetType;
};

export function inferCreativeTypeFromStorySpec(spec?: Record<string, unknown>): CreativeAssetType {
  if (!spec) return "image";

  if (spec.video_data) return "video";

  const linkData = spec.link_data as Record<string, unknown> | undefined;
  if (linkData?.child_attachments) return "carousel";

  if (spec.photo_data) return "image";

  if (linkData) {
    if (linkData.image_hash || linkData.picture) return "image";
    if (typeof linkData.name === "string" && linkData.name.trim()) return "headline";
    if (typeof linkData.description === "string" && linkData.description.trim()) return "description";
    if (typeof linkData.message === "string" && linkData.message.trim()) return "copy";
  }

  const feed = spec.asset_feed_spec as Record<string, unknown> | undefined;
  if (feed?.images || feed?.videos) return "carousel";

  return "image";
}

const AD_CREATIVE_FIELDS = "creative{id,name,thumbnail_url,object_story_spec,asset_feed_spec}";
const AD_LIST_FIELDS = ["id", "name", "status", "adset_id", AD_CREATIVE_FIELDS].join(",");

export function extractImageHashFromStorySpec(spec?: Record<string, unknown>): string | undefined {
  if (!spec) return undefined;
  const linkData = spec.link_data as Record<string, unknown> | undefined;
  if (typeof linkData?.image_hash === "string") return linkData.image_hash;
  const photoData = spec.photo_data as Record<string, unknown> | undefined;
  if (typeof photoData?.image_hash === "string") return photoData.image_hash;
  const videoData = spec.video_data as Record<string, unknown> | undefined;
  if (typeof videoData?.image_hash === "string") return videoData.image_hash;
  return undefined;
}

export function resolveCreativeFromAd(ad: MetaAd): ResolvedAdCreative | null {
  const raw = ad.creative;
  if (!raw) return null;

  if (typeof raw === "string") {
    return { id: raw, name: ad.name, type: "image" };
  }

  const imageHash = extractImageHashFromStorySpec(raw.object_story_spec);
  const thumbnailUrl = raw.thumbnail_url;
  const name = raw.name ?? ad.name;
  const type = raw.asset_feed_spec
    ? inferCreativeTypeFromStorySpec({ asset_feed_spec: raw.asset_feed_spec })
    : inferCreativeTypeFromStorySpec(raw.object_story_spec);
  const id = raw.id ?? (thumbnailUrl ? `thumb:${thumbnailUrl}` : imageHash ? `hash:${imageHash}` : undefined);

  if (!id) return null;

  return { id, name, thumbnailUrl, imageHash, type };
}

export type CampaignAdRow = MetaAd & {
  adsetId: string;
  adsetName?: string;
};

export async function metaFetch<T>(path: string, accessToken: string): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  const { data } = await metaFetchWithRateLimit<T>(url.toString());
  return data;
}

/**
 * Leitura mínima a nível de conta para checar permissão (ads_read/ads_management).
 * true = token tem acesso; caso contrário retorna o erro da Meta (ex.: #200).
 */
export async function probeAdAccountAccess(
  accessToken: string,
  adAccountId: string
): Promise<{ ok: boolean; error?: string }> {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  try {
    await metaFetch<{ id: string }>(`/${id}?fields=id`, accessToken);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
      `/${encodeURIComponent(businessUserId)}/assigned_ad_accounts?fields=id,name,account_status,timezone_name&limit=100`,
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
  const fields = "id,name,account_status,timezone_name";
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
      timezone_name: acc.timezone_name ?? prev?.timezone_name,
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
  const first = `/me/adaccounts?fields=id,name,account_status,timezone_name,business{id,name}&limit=100`;
  return fetchGraphPaged<MetaAdAccount>(first, accessToken);
}

/** Gasto dos últimos 30 dias por conta (best-effort, em 1 chamada via subcampo insights). */
export async function fetchMyAdAccountsSpendLast30d(
  accessToken: string
): Promise<Map<string, number>> {
  const path = `/me/adaccounts?fields=id,insights.date_preset(last_30d){spend}&limit=200`;
  const rows = await fetchGraphPaged<{
    id: string;
    insights?: { data?: Array<{ spend?: string }> };
  }>(path, accessToken);
  const map = new Map<string, number>();
  for (const r of rows) {
    const spend = Number(r.insights?.data?.[0]?.spend ?? 0);
    if (Number.isFinite(spend)) map.set(r.id, spend);
  }
  return map;
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

export type MetaCustomConversion = { id: string; name?: string; custom_event_type?: string };

export async function fetchCustomConversions(
  accessToken: string,
  adAccountId: string
): Promise<MetaCustomConversion[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  try {
    const path = `/${encodeURIComponent(act)}/customconversions?fields=id,name,custom_event_type&limit=100`;
    return fetchGraphPaged<MetaCustomConversion>(path, accessToken);
  } catch {
    return [];
  }
}

export const STANDARD_CONVERSION_EVENTS = [
  "LEAD",
  "PURCHASE",
  "COMPLETE_REGISTRATION",
  "ADD_TO_CART",
  "INITIATED_CHECKOUT",
  "SUBSCRIBE",
  "CONTACT"
] as const;

export async function fetchUserPages(accessToken: string): Promise<MetaFacebookPage[]> {
  return fetchGraphPaged<MetaFacebookPage>("/me/accounts?fields=id,name&limit=100", accessToken);
}

/**
 * Páginas que a conta de anúncios pode promover (live Graph API).
 *
 * Usa apenas a edge `promote_pages`, que é a válida no nó `act_<id>`. A antiga
 * `assigned_pages` não existe nesse nó (só em Business/System User) e sempre
 * retornava o erro `(#100) nonexisting field`. Páginas atribuídas via Business
 * já chegam pelo inventário local em `resolvePagesForAdAccount`.
 */
export async function fetchPagesForAdAccount(
  accessToken: string,
  adAccountId: string
): Promise<MetaFacebookPage[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  try {
    return await fetchGraphPaged<MetaFacebookPage>(
      `/${encodeURIComponent(act)}/promote_pages?fields=id,name&limit=100`,
      accessToken
    );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[meta-graph] promote_pages for ${act}:`, err);
    }
    return [];
  }
}

/** Instagram vinculado às páginas (fallback quando instagram_accounts da conta vem vazio). */
export async function fetchInstagramFromPages(
  accessToken: string,
  pageIds: string[]
): Promise<MetaInstagramAccount[]> {
  const seen = new Map<string, MetaInstagramAccount>();
  for (const pageId of pageIds.slice(0, 25)) {
    if (!pageId.trim()) continue;
    try {
      const data = await metaFetch<{
        connected_instagram_account?: { id?: string; username?: string };
      }>(
        `/${encodeURIComponent(pageId)}?fields=${encodeURIComponent("connected_instagram_account{id,username}")}`,
        accessToken
      );
      const ig = data.connected_instagram_account;
      if (ig?.id && !seen.has(ig.id)) {
        seen.set(ig.id, { id: ig.id, username: ig.username });
      }
    } catch {
      /* skip page */
    }
  }
  return [...seen.values()];
}

export type MetaPageWhatsappNumber = {
  pageId: string;
  phone: string;
  waMeUrl: string;
  isBusiness?: boolean;
};

export function buildWaMeUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

/** WhatsApp vinculado às páginas (campo whatsapp_number da Graph API). */
export async function fetchWhatsappNumbersFromPages(
  accessToken: string,
  pageIds: string[]
): Promise<MetaPageWhatsappNumber[]> {
  const results: MetaPageWhatsappNumber[] = [];
  for (const pageId of pageIds.slice(0, 25)) {
    if (!pageId.trim()) continue;
    try {
      const data = await metaFetch<{
        whatsapp_number?: string;
        has_whatsapp_business_number?: boolean;
      }>(
        `/${encodeURIComponent(pageId)}?fields=${encodeURIComponent("whatsapp_number,has_whatsapp_business_number")}`,
        accessToken
      );
      const phone = data.whatsapp_number?.trim();
      if (!phone) continue;
      results.push({
        pageId,
        phone,
        waMeUrl: buildWaMeUrl(phone),
        isBusiness: data.has_whatsapp_business_number
      });
    } catch {
      /* skip page */
    }
  }
  return results;
}

// ---- Targeting search (/search) ----

export type MetaInterest = { id: string; name: string; audienceSize?: number; path?: string[] };

export async function searchAdInterests(accessToken: string, q: string): Promise<MetaInterest[]> {
  if (!q.trim()) return [];
  const path = `/search?type=adinterest&limit=25&q=${encodeURIComponent(q.trim())}`;
  const data = await metaFetch<{
    data: Array<{ id: string; name: string; audience_size_lower_bound?: number; path?: string[] }>;
  }>(path, accessToken);
  return (data.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    audienceSize: d.audience_size_lower_bound,
    path: d.path
  }));
}

export type MetaGeoLocation = {
  key: string;
  name: string;
  type: string;
  countryCode?: string;
  region?: string;
};

export async function searchGeoLocations(accessToken: string, q: string): Promise<MetaGeoLocation[]> {
  if (!q.trim()) return [];
  const locationTypes = encodeURIComponent(JSON.stringify(["city", "region", "country"]));
  const path = `/search?type=adgeolocation&location_types=${locationTypes}&limit=25&q=${encodeURIComponent(
    q.trim()
  )}`;
  const data = await metaFetch<{
    data: Array<{ key: string; name: string; type: string; country_code?: string; region?: string }>;
  }>(path, accessToken);
  return (data.data ?? []).map((d) => ({
    key: d.key,
    name: d.name,
    type: d.type,
    countryCode: d.country_code,
    region: d.region
  }));
}

export type MetaDeliveryEstimate = {
  estimateReady: boolean;
  usersLowerBound: number | null;
  usersUpperBound: number | null;
};

/** Meta Marketing API delivery estimate (monthly active users in targeting). */
export async function fetchDeliveryEstimate(
  accessToken: string,
  adAccountId: string,
  targetingSpec: Record<string, unknown>
): Promise<MetaDeliveryEstimate> {
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const spec = encodeURIComponent(JSON.stringify(targetingSpec));
  const data = await metaFetch<{
    data?: Array<{
      estimate_ready?: boolean;
      estimate_mau_lower_bound?: number;
      estimate_mau_upper_bound?: number;
    }>;
  }>(
    `/${actId}/delivery_estimate?targeting_spec=${spec}&optimization_goal=REACH`,
    accessToken
  );
  const row = data.data?.[0];
  return {
    estimateReady: row?.estimate_ready ?? false,
    usersLowerBound: row?.estimate_mau_lower_bound ?? null,
    usersUpperBound: row?.estimate_mau_upper_bound ?? null
  };
}

export type MetaLocale = { key: number; name: string };

export async function searchAdLocales(accessToken: string, q: string): Promise<MetaLocale[]> {
  if (!q.trim()) return [];
  const path = `/search?type=adlocale&limit=25&q=${encodeURIComponent(q.trim())}`;
  const data = await metaFetch<{ data: Array<{ key: number; name: string }> }>(path, accessToken);
  return (data.data ?? []).map((d) => ({ key: d.key, name: d.name }));
}

export type MetaTargetingCategory = { id: string; name: string; audience_size?: number; path?: string[] };

export async function searchAdTargetingCategories(
  accessToken: string,
  q: string,
  classType: "behaviors" | "demographics" | "life_events"
): Promise<MetaTargetingCategory[]> {
  if (!q.trim()) return [];
  const path = `/search?type=adTargetingCategory&class=${classType}&limit=25&q=${encodeURIComponent(q.trim())}`;
  const data = await metaFetch<{
    data: Array<{ id: string; name: string; audience_size_lower_bound?: number; path?: string[] }>;
  }>(path, accessToken);
  return (data.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    audience_size: d.audience_size_lower_bound,
    path: d.path
  }));
}

export type MetaTargetingValidationItem = {
  id: string;
  name?: string;
  type?: string;
  valid?: boolean;
};

/** Valida IDs de interesse/comportamento/demografia e retorna o bucket correto (type). */
export async function validateTargetingIdList(
  accessToken: string,
  adAccountId: string,
  ids: string[]
): Promise<MetaTargetingValidationItem[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 40) {
    chunks.push(unique.slice(i, i + 40));
  }

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const idList = encodeURIComponent(JSON.stringify(chunk));
      const data = await metaFetch<{
        data: Array<{
          id?: string;
          name?: string;
          type?: string;
          valid?: boolean;
        }>;
      }>(
        `/${encodeURIComponent(act)}/targetingvalidation?id_list=${idList}`,
        accessToken
      );
      const rows: MetaTargetingValidationItem[] = [];
      for (const row of data.data ?? []) {
        if (!row.id) continue;
        rows.push({
          id: String(row.id),
          name: row.name,
          type: row.type,
          valid: row.valid
        });
      }
      return rows;
    })
  );

  return chunkResults.flat();
}

export type MetaInstagramAccount = { id: string; username?: string };

/** Contas do Instagram utilizáveis por uma conta de anúncio. */
export async function fetchInstagramAccountsForAdAccount(
  accessToken: string,
  adAccountId: string
): Promise<MetaInstagramAccount[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  try {
    const first = `/${encodeURIComponent(act)}/instagram_accounts?fields=id,username&limit=100`;
    return await fetchGraphPaged<MetaInstagramAccount>(first, accessToken);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[meta-graph] instagram_accounts for ${act}:`, err);
    }
    return [];
  }
}

export async function fetchCustomAudiences(
  accessToken: string,
  adAccountId: string
): Promise<MetaCustomAudience[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const fields = [
    "id",
    "name",
    "subtype",
    "approximate_count_lower_bound",
    "approximate_count_upper_bound",
    "lookalike_spec"
  ].join(",");
  const data = await metaFetch<{ data: MetaCustomAudience[] }>(
    `/${encodeURIComponent(act)}/customaudiences?fields=${encodeURIComponent(fields)}&limit=100`,
    accessToken
  );
  return data.data ?? [];
}

export type MetaCustomAudienceDetail = MetaCustomAudience & {
  description?: string;
  delivery_status?: { code?: number; description?: string };
  operation_status?: { code?: number; description?: string };
  time_created?: string;
  time_updated?: string;
  account_id?: string;
  rule?: unknown;
};

export async function fetchCustomAudienceDetail(
  accessToken: string,
  audienceId: string
): Promise<MetaCustomAudienceDetail> {
  const fields = [
    "id",
    "name",
    "subtype",
    "description",
    "delivery_status",
    "operation_status",
    "time_created",
    "time_updated",
    "approximate_count_lower_bound",
    "approximate_count_upper_bound",
    "lookalike_spec",
    "rule",
    "account_id"
  ].join(",");
  return metaFetch<MetaCustomAudienceDetail>(
    `/${encodeURIComponent(audienceId)}?fields=${encodeURIComponent(fields)}`,
    accessToken
  );
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

export type MetaAdSetDetail = {
  id: string;
  name?: string;
  targeting?: Record<string, unknown>;
  promoted_object?: Record<string, unknown>;
  destination_type?: string;
  optimization_goal?: string;
  billing_event?: string;
  start_time?: string;
  end_time?: string;
  daily_budget?: string;
  is_dynamic_creative?: boolean;
};

export async function fetchAdSetDetail(
  accessToken: string,
  adSetId: string,
  fields = "id,name,targeting,promoted_object,destination_type,optimization_goal,billing_event,start_time,end_time,daily_budget,is_dynamic_creative"
): Promise<MetaAdSetDetail> {
  return metaFetch<MetaAdSetDetail>(
    `/${encodeURIComponent(adSetId)}?fields=${encodeURIComponent(fields)}`,
    accessToken
  );
}

export type MetaAdWithCreative = {
  id: string;
  name?: string;
  creative?: {
    id?: string;
    body?: string;
    title?: string;
    object_story_spec?: Record<string, unknown>;
    asset_feed_spec?: {
      images?: Array<{ hash?: string }>;
      videos?: Array<{ video_id?: string }>;
      titles?: Array<{ text?: string }>;
      bodies?: Array<{ text?: string }>;
      descriptions?: Array<{ text?: string }>;
      link_urls?: Array<{ website_url?: string }>;
      call_to_action_types?: string[];
    };
    page_welcome_message?: unknown;
  };
};

export async function fetchAdWithCreative(
  accessToken: string,
  adId: string
): Promise<MetaAdWithCreative> {
  const fields =
    "id,name,creative{id,body,title,page_welcome_message,object_story_spec,asset_feed_spec{images,videos,titles,bodies,descriptions,link_urls,call_to_action_types}}";
  return metaFetch<MetaAdWithCreative>(
    `/${encodeURIComponent(adId)}?fields=${encodeURIComponent(fields)}`,
    accessToken
  );
}

export async function fetchLeadGenForms(
  accessToken: string,
  pageId: string
): Promise<Array<{ id: string; name?: string; status?: string }>> {
  const data = await metaFetch<{ data?: Array<{ id: string; name?: string; status?: string }> }>(
    `/${pageId}/leadgen_forms?fields=id,name,status&limit=50`,
    accessToken
  );
  return data.data ?? [];
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

/**
 * Upload an image to the ad account library from raw bytes (multipart), instead of
 * passing a remote `url`. Required when the source is a local file assembled from
 * chunked parts — Meta cannot fetch `data:` URLs.
 */
export async function uploadAdImageBytes(
  accessToken: string,
  adAccountId: string,
  file: Buffer,
  fileName: string,
  name: string
): Promise<{ images: Record<string, { hash: string }> }> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("name", name);
  form.append(fileName, new Blob([new Uint8Array(file)]), fileName);

  const url = `${GRAPH_BASE}/${encodeURIComponent(act)}/adimages`;
  const { data } = await metaFetchWithRateLimit<{ images: Record<string, { hash: string }> }>(url, {
    method: "POST",
    body: form
  });
  return data;
}

export async function uploadAdVideo(
  accessToken: string,
  adAccountId: string,
  file: Buffer,
  fileName: string,
  title: string
): Promise<{ id: string }> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("name", title);
  form.append("source", new Blob([new Uint8Array(file)]), fileName);

  const url = `${GRAPH_BASE}/${encodeURIComponent(act)}/advideos`;
  const { data } = await metaFetchWithRateLimit<{ id: string }>(url, {
    method: "POST",
    body: form
  });
  return data;
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

/**
 * `last_30d` da Meta NÃO inclui o dia de hoje. Para enxergar o dia corrente,
 * sincronizamos também com `date_preset=today` (a Meta resolve no fuso da conta).
 */
export async function fetchAccountInsightsDaily(
  accessToken: string,
  adAccountId: string,
  datePreset = "last_30d",
  /**
   * Opcional (P2). Quando informado, adiciona `action_attribution_windows` à
   * chamada. **Default undefined = comportamento atual** — não usar no sync/ranking;
   * só no preview de atribuição, para não alterar os snapshots/ranking.
   */
  attributionWindows?: string[]
): Promise<MetaInsightRow[]> {
  const fields = INSIGHT_METRIC_FIELDS.join(",");
  const attr =
    attributionWindows && attributionWindows.length
      ? `&action_attribution_windows=${encodeURIComponent(JSON.stringify(attributionWindows))}`
      : "";
  const path = `/${encodeURIComponent(adAccountId)}/insights?fields=${encodeURIComponent(fields)}&time_increment=1&date_preset=${datePreset}${attr}&limit=500`;
  return fetchGraphPaged<MetaInsightRow>(path, accessToken);
}

export type MetaBreakdownInsightRow = MetaCampaignInsightRow & {
  age?: string;
  gender?: string;
  region?: string;
  country?: string;
  device_platform?: string;
};

export type InsightBreakdownType = "age" | "gender" | "region" | "device_platform";

/** Insights with demographic breakdowns for AI audience suggestions. */
export async function fetchInsightsWithBreakdowns(
  accessToken: string,
  adAccountId: string,
  breakdowns: Array<"age" | "gender" | "region">,
  datePreset = "last_30d",
  level: "campaign" | "adset" = "campaign"
): Promise<MetaBreakdownInsightRow[]> {
  return fetchInsightsWithBreakdownsForRange(
    accessToken,
    adAccountId,
    breakdowns,
    undefined,
    undefined,
    datePreset,
    level
  );
}

/** Insights with breakdowns for an arbitrary date range (reports, backfill). */
export async function fetchInsightsWithBreakdownsForRange(
  accessToken: string,
  adAccountId: string,
  breakdowns: InsightBreakdownType[],
  since?: string,
  until?: string,
  datePreset = "last_30d",
  level: "campaign" | "adset" = "campaign"
): Promise<MetaBreakdownInsightRow[]> {
  const fields = [
    level === "campaign" ? "campaign_id" : "adset_id",
    level === "campaign" ? "campaign_name" : "adset_name",
    ...INSIGHT_METRIC_FIELDS.filter((f) => f !== "date_start")
  ].join(",");
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const rangeParam =
    since && until
      ? `&time_range=${encodeURIComponent(JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) }))}`
      : `&date_preset=${datePreset}`;
  const path = `/${encodeURIComponent(act)}/insights?level=${level}&fields=${encodeURIComponent(fields)}&breakdowns=${breakdowns.join(",")}${rangeParam}&limit=500`;
  return fetchGraphPaged<MetaBreakdownInsightRow>(path, accessToken);
}

export async function fetchCampaignInsightsDaily(
  accessToken: string,
  adAccountId: string,
  datePreset = "last_30d"
): Promise<MetaCampaignInsightRow[]> {
  const fields = ["campaign_id", "campaign_name", ...INSIGHT_METRIC_FIELDS].join(",");
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=campaign&fields=${encodeURIComponent(fields)}&time_increment=1&date_preset=${datePreset}&limit=500`;
  return fetchGraphPaged<MetaCampaignInsightRow>(path, accessToken);
}

export async function fetchAdsetInsightsDaily(
  accessToken: string,
  adAccountId: string,
  datePreset = "last_30d"
): Promise<MetaAdsetInsightRow[]> {
  const fields = ["campaign_id", "campaign_name", "adset_id", "adset_name", ...INSIGHT_METRIC_FIELDS].join(",");
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=adset&fields=${encodeURIComponent(fields)}&time_increment=1&date_preset=${datePreset}&limit=500`;
  return fetchGraphPaged<MetaAdsetInsightRow>(path, accessToken);
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
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=campaign&fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}&limit=500`;
  return fetchGraphPaged<MetaCampaignInsightRow>(path, accessToken);
}

/**
 * Insights CAMPAIGN em nível de campanha com granularidade diária para um range arbitrário.
 * Necessário para backfill histórico (ex.: 90d em blocos de 30d).
 */
export async function fetchCampaignInsightsDailyForRange(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
): Promise<MetaCampaignInsightRow[]> {
  const fields = ["campaign_id", "campaign_name", ...INSIGHT_METRIC_FIELDS].join(",");
  const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=campaign&fields=${encodeURIComponent(
    fields
  )}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=500`;
  return fetchGraphPaged<MetaCampaignInsightRow>(path, accessToken);
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
  const path = `/${encodeURIComponent(metaCampaignId)}/insights?fields=${encodeURIComponent(fields)}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=500`;
  return fetchGraphPaged<MetaCampaignInsightRow>(path, accessToken);
}

export async function fetchAdImages(accessToken: string, adAccountId: string): Promise<MetaAdImage[]> {
  const fields = ["id", "hash", "name", "url"].join(",");
  const path = `/${encodeURIComponent(adAccountId)}/adimages?fields=${encodeURIComponent(fields)}&limit=50`;
  const data = await metaFetch<{ data: MetaAdImage[] }>(path, accessToken);
  return data.data ?? [];
}

export async function fetchAdVideos(accessToken: string, adAccountId: string): Promise<MetaAdVideo[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const fields = ["id", "title", "picture", "source"].join(",");
  const path = `/${encodeURIComponent(act)}/advideos?fields=${encodeURIComponent(fields)}&limit=100`;
  return fetchGraphPaged<MetaAdVideo>(path, accessToken);
}

export async function fetchPageVideos(accessToken: string, pageId: string): Promise<MetaAdVideo[]> {
  const path = `/${encodeURIComponent(pageId)}/videos?fields=${encodeURIComponent("id,title,picture")}&limit=100`;
  return fetchGraphPaged<MetaAdVideo>(path, accessToken);
}

export type MetaInstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  thumbnail_url?: string;
  permalink?: string;
};

export async function fetchInstagramVideoMedia(
  accessToken: string,
  igBusinessId: string
): Promise<MetaInstagramMedia[]> {
  const path = `/${encodeURIComponent(igBusinessId)}/media?fields=${encodeURIComponent("id,caption,media_type,thumbnail_url,permalink")}&limit=100`;
  const rows = await fetchGraphPaged<MetaInstagramMedia>(path, accessToken);
  return rows.filter((r) => r.media_type === "VIDEO");
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

/** Conversas de mensagens iniciadas (Messenger/Instagram/WhatsApp). */
export function pickMessages(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions?.length) return 0;
  let sum = 0;
  for (const a of actions) {
    if (a.action_type.includes("messaging_conversation_started")) sum += Number(a.value) || 0;
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
  const fields = ["id", "name", "status", "objective", "daily_budget", "buying_type"].join(",");
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
  const path = `/${encodeURIComponent(adSetId)}/ads?fields=${encodeURIComponent(AD_LIST_FIELDS)}&limit=100`;
  return fetchGraphPaged<MetaAd>(path, accessToken);
}

/** Lista leve de anúncios (sem object_story_spec) para seletores hierárquicos. */
export async function fetchAdsForAdSetLite(
  accessToken: string,
  adSetId: string,
  limit = 50
): Promise<Array<{ id: string; name?: string; status?: string; thumbnailUrl?: string }>> {
  const fields = "id,name,status,creative{thumbnail_url}";
  const path = `/${encodeURIComponent(adSetId)}/ads?fields=${encodeURIComponent(fields)}&limit=${limit}`;
  const rows = await fetchGraphPaged<{
    id: string;
    name?: string;
    status?: string;
    creative?: { thumbnail_url?: string };
  }>(path, accessToken);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    thumbnailUrl: r.creative?.thumbnail_url
  }));
}

async function mapAdsWithAdsetNames(
  accessToken: string,
  campaignId: string,
  ads: MetaAd[]
): Promise<CampaignAdRow[]> {
  const adsets = await fetchAdSetsForCampaign(accessToken, campaignId);
  const adsetMap = new Map(adsets.map((a) => [a.id, a.name]));
  return ads.map((ad) => ({
    ...ad,
    adsetId: ad.adset_id ?? "",
    adsetName: adsetMap.get(ad.adset_id ?? "") ?? ad.adset_id
  }));
}

export async function fetchAdsForCampaign(
  accessToken: string,
  campaignId: string
): Promise<CampaignAdRow[]> {
  const campaignPath = `/${encodeURIComponent(campaignId)}/ads?fields=${encodeURIComponent(AD_LIST_FIELDS)}&limit=100`;
  try {
    const direct = await fetchGraphPaged<MetaAd>(campaignPath, accessToken);
    if (direct.length > 0) {
      return mapAdsWithAdsetNames(accessToken, campaignId, direct);
    }
  } catch {
    /* fallback via ad sets */
  }

  const adsets = await fetchAdSetsForCampaign(accessToken, campaignId);
  const rows: CampaignAdRow[] = [];

  for (const adset of adsets) {
    const ads = await fetchAdsForAdSet(accessToken, adset.id);
    for (const ad of ads) {
      rows.push({
        ...ad,
        adsetId: adset.id,
        adsetName: adset.name
      });
    }
  }

  return rows;
}

export type MetaAdSetInsight = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  reach: number;
  conversions: number;
  messages: number;
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
    let path = `/${encodeURIComponent(adSetId)}/insights?fields=${encodeURIComponent(fields)}&use_unified_attribution_setting=true`;
    if (since && until) {
      const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
      path += `&time_range=${encodeURIComponent(timeRange)}`;
    } else {
      path += "&date_preset=last_7d";
    }
    const data = await metaFetch<{ data: MetaInsightRow[] }>(path, accessToken);
    const row = data.data?.[0];
    if (!row) return null;
    return insightRowToAdSetInsight(row);
  } catch {
    return null;
  }
}

function insightRowToAdSetInsight(row: MetaInsightRow): MetaAdSetInsight {
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
    messages: pickMessages(row.actions),
    roas: Number.isFinite(roas) ? roas : 0
  };
}

/** Insights de todos os ad sets de uma campanha em uma chamada (level=adset + filtering). */
export async function fetchAdSetInsightsForCampaign(
  accessToken: string,
  adAccountId: string,
  metaCampaignId: string,
  since: string,
  until: string
): Promise<Map<string, MetaAdSetInsight>> {
  const fields = ["campaign_id", "adset_id", "spend", "impressions", "clicks", "ctr", "reach", "actions", "results", "purchase_roas"].join(
    ","
  );
  const timeRange = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
  const filtering = JSON.stringify([
    { field: "campaign.id", operator: "EQUAL", value: metaCampaignId }
  ]);
  const path = `/${encodeURIComponent(adAccountId)}/insights?level=adset&fields=${encodeURIComponent(
    fields
  )}&time_range=${encodeURIComponent(timeRange)}&filtering=${encodeURIComponent(filtering)}&limit=500`;
  const rows = await fetchGraphPaged<MetaAdsetInsightRow>(path, accessToken);
  const out = new Map<string, MetaAdSetInsight>();
  for (const row of rows) {
    const adsetId = row.adset_id;
    if (!adsetId) continue;
    out.set(adsetId, insightRowToAdSetInsight(row));
  }
  return out;
}

export type AdInsightMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  reach: number;
  conversions: number;
  messages: number;
  roas: number;
  cpc: number;
  cpm: number;
  cpa: number;
  cpmsg: number;
  frequency: number;
};

/** Insights por anúncio de uma campanha (1 chamada, level=ad). */
export async function fetchAdInsightsForCampaign(
  accessToken: string,
  campaignId: string,
  opts?: { datePreset?: string; since?: string | null; until?: string | null }
): Promise<Map<string, AdInsightMetrics>> {
  const map = new Map<string, AdInsightMetrics>();
  const range =
    opts?.since && opts?.until
      ? `time_range=${encodeURIComponent(
          JSON.stringify({ since: opts.since.slice(0, 10), until: opts.until.slice(0, 10) })
        )}`
      : `date_preset=${opts?.datePreset ?? "last_30d"}`;
  try {
    const fields = [
      "ad_id",
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "reach",
      "actions",
      "results",
      "purchase_roas"
    ].join(",");
    const path = `/${encodeURIComponent(campaignId)}/insights?level=ad&fields=${encodeURIComponent(fields)}&${range}&use_unified_attribution_setting=true&limit=500`;
    const rows = await fetchGraphPaged<MetaInsightRow & { ad_id?: string }>(path, accessToken);
    for (const row of rows) {
      const adId = row.ad_id;
      if (!adId) continue;
      const spend = Number(row.spend) || 0;
      const impressions = Number(row.impressions) || 0;
      const clicks = Number(row.clicks) || 0;
      const reach = Number(row.reach) || 0;
      const conversions = pickResults(row);
      const messages = pickMessages(row.actions);
      const roasRaw = row.purchase_roas?.[0]?.value;
      const roas = roasRaw != null ? Number(roasRaw) : 0;
      map.set(adId, {
        spend,
        impressions,
        clicks,
        ctr: Number(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0),
        reach,
        conversions,
        messages,
        roas: Number.isFinite(roas) ? roas : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        cpmsg: messages > 0 ? spend / messages : 0,
        frequency: reach > 0 ? impressions / reach : 0
      });
    }
  } catch {
    /* sem insights → mapa vazio */
  }
  return map;
}

function parseAdInsightRow(row: MetaInsightRow & { ad_id?: string }): [string, AdInsightMetrics] | null {
  const adId = row.ad_id;
  if (!adId) return null;
  const spend = Number(row.spend) || 0;
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  const reach = Number(row.reach) || 0;
  const conversions = pickResults(row);
  const messages = pickMessages(row.actions);
  const roasRaw = row.purchase_roas?.[0]?.value;
  const roas = roasRaw != null ? Number(roasRaw) : 0;
  return [
    adId,
    {
      spend,
      impressions,
      clicks,
      ctr: Number(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0),
      reach,
      conversions,
      messages,
      roas: Number.isFinite(roas) ? roas : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      cpmsg: messages > 0 ? spend / messages : 0,
      frequency: reach > 0 ? impressions / reach : 0
    }
  ];
}

const AD_INSIGHT_FIELDS =
  "ad_id,spend,impressions,clicks,ctr,reach,actions,results,purchase_roas";

/** Insights por anúncio de uma conta inteira (1 chamada, level=ad). */
export async function fetchAdInsightsForAccount(
  accessToken: string,
  adAccountId: string,
  opts?: { datePreset?: string; since?: string | null; until?: string | null }
): Promise<Map<string, AdInsightMetrics>> {
  const map = new Map<string, AdInsightMetrics>();
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const range =
    opts?.since && opts?.until
      ? `time_range=${encodeURIComponent(
          JSON.stringify({ since: opts.since.slice(0, 10), until: opts.until.slice(0, 10) })
        )}`
      : `date_preset=${opts?.datePreset ?? "last_30d"}`;
  try {
    const path = `/${encodeURIComponent(act)}/insights?level=ad&fields=${encodeURIComponent(AD_INSIGHT_FIELDS)}&${range}&use_unified_attribution_setting=true&limit=500`;
    const rows = await fetchGraphPaged<MetaInsightRow & { ad_id?: string }>(path, accessToken);
    for (const row of rows) {
      const entry = parseAdInsightRow(row);
      if (entry) map.set(entry[0], entry[1]);
    }
  } catch {
    /* sem insights */
  }
  return map;
}

export type AdCreativeCopy = {
  bodies: string[];
  titles: string[];
  descriptions: string[];
  ctas: string[];
};

function readWelcomeMessageForCopy(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const direct = obj.text ?? obj.message ?? obj.greeting ?? obj.autofill_message;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (direct && typeof direct === "object") {
    const nested = (direct as Record<string, unknown>).text;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return null;
}

/** Textos do criativo (corpo, título, descrição, CTA) — para a aba "Copy". */
export async function fetchAdCreativeCopy(
  accessToken: string,
  adId: string
): Promise<AdCreativeCopy> {
  const bodies = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const ctas = new Set<string>();
  const add = (set: Set<string>, v: unknown) => {
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  };
  try {
    const data = await metaFetch<{
      creative?: {
        body?: string;
        title?: string;
        page_welcome_message?: unknown;
        object_story_spec?: Record<string, Record<string, unknown> | undefined>;
        asset_feed_spec?: {
          bodies?: Array<{ text?: string }>;
          titles?: Array<{ text?: string }>;
          descriptions?: Array<{ text?: string }>;
          call_to_action_types?: string[];
        };
      };
    }>(
      `/${encodeURIComponent(adId)}?fields=${encodeURIComponent(
        "creative{body,title,page_welcome_message,object_story_spec,asset_feed_spec}"
      )}`,
      accessToken
    );
    const c = data.creative ?? {};
    add(bodies, c.body);
    add(titles, c.title);

    const spec = c.object_story_spec ?? {};
    for (const key of ["link_data", "video_data", "template_data", "photo_data"]) {
      const d = spec[key];
      if (!d) continue;
      add(bodies, d.message);
      add(titles, d.name);
      add(titles, d.title);
      add(descriptions, d.description);
      add(descriptions, d.caption);
      const cta = d.call_to_action as { type?: string } | undefined;
      if (cta?.type) add(ctas, cta.type);
    }

    add(bodies, readWelcomeMessageForCopy(c.page_welcome_message));

    const feed = c.asset_feed_spec ?? {};
    for (const b of feed.bodies ?? []) add(bodies, b?.text);
    for (const tt of feed.titles ?? []) add(titles, tt?.text);
    for (const d of feed.descriptions ?? []) add(descriptions, d?.text);
    for (const cta of feed.call_to_action_types ?? []) add(ctas, cta);
  } catch {
    /* sem textos */
  }
  return {
    bodies: [...bodies],
    titles: [...titles],
    descriptions: [...descriptions],
    ctas: [...ctas]
  };
}

/** Conta e criativo de um anúncio (para rastrear onde o criativo é usado). */
export async function fetchAdRef(
  accessToken: string,
  adId: string
): Promise<{ accountId: string | null; creativeId: string | null }> {
  try {
    const data = await metaFetch<{ account_id?: string; creative?: { id?: string } }>(
      `/${encodeURIComponent(adId)}?fields=account_id,creative{id}`,
      accessToken
    );
    return { accountId: data.account_id ?? null, creativeId: data.creative?.id ?? null };
  } catch {
    return { accountId: null, creativeId: null };
  }
}

export type AdPreview = { src: string; width: number | null; height: number | null };

export type AdsetPlacementInfo = {
  adsetId: string;
  adsetName: string;
  campaignName: string;
  platforms: string[];
  positions: string[];
};

const PLACEMENT_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
  feed: "Feed",
  story: "Stories",
  reels: "Reels",
  video_feeds: "Vídeos no feed",
  right_hand_column: "Coluna direita",
  instant_article: "Artigos instantâneos",
  instream_video: "In-stream",
  marketplace: "Marketplace",
  search: "Busca",
  explore: "Explorar",
  profile_feed: "Feed do perfil"
};

function labelPlacement(value: string): string {
  return PLACEMENT_LABELS[value] ?? value.replace(/_/g, " ");
}

export async function fetchAdsetPlacementInfo(
  accessToken: string,
  adsetId: string,
  campaignName = "",
  adsetName = ""
): Promise<AdsetPlacementInfo> {
  try {
    const data = await metaFetch<{
      name?: string;
      campaign?: { name?: string };
      targeting?: {
        publisher_platforms?: string[];
        facebook_positions?: string[];
        instagram_positions?: string[];
        messenger_positions?: string[];
        audience_network_positions?: string[];
      };
    }>(
      `/${encodeURIComponent(adsetId)}?fields=${encodeURIComponent("name,campaign{name},targeting{publisher_platforms,facebook_positions,instagram_positions,messenger_positions,audience_network_positions}")}`,
      accessToken
    );
    const t = data.targeting ?? {};
    const platforms = (t.publisher_platforms ?? []).map(labelPlacement);
    const positions = [
      ...(t.facebook_positions ?? []).map((p) => `Facebook · ${labelPlacement(p)}`),
      ...(t.instagram_positions ?? []).map((p) => `Instagram · ${labelPlacement(p)}`),
      ...(t.messenger_positions ?? []).map((p) => `Messenger · ${labelPlacement(p)}`),
      ...(t.audience_network_positions ?? []).map((p) => `Audience Network · ${labelPlacement(p)}`)
    ];
    return {
      adsetId,
      adsetName: data.name ?? adsetName,
      campaignName: data.campaign?.name ?? campaignName,
      platforms,
      positions
    };
  } catch {
    return { adsetId, adsetName, campaignName, platforms: [], positions: [] };
  }
}

/** Preview real do anúncio (iframe renderizado pela Meta). Retorna URL + dimensões. */
export async function fetchAdPreview(
  accessToken: string,
  adId: string,
  format = "MOBILE_FEED_STANDARD"
): Promise<AdPreview | null> {
  try {
    const data = await metaFetch<{ data?: Array<{ body?: string }> }>(
      `/${encodeURIComponent(adId)}/previews?ad_format=${encodeURIComponent(format)}`,
      accessToken
    );
    const body = data.data?.[0]?.body;
    if (!body) return null;
    const srcMatch = body.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) return null;
    const widthMatch = body.match(/width=["']?(\d+)/i);
    const heightMatch = body.match(/height=["']?(\d+)/i);
    return {
      src: srcMatch[1].replace(/&amp;/g, "&"),
      width: widthMatch ? Number(widthMatch[1]) : null,
      height: heightMatch ? Number(heightMatch[1]) : null
    };
  } catch {
    return null;
  }
}

export type AdUsageRow = {
  id: string;
  name?: string;
  status?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  creativeId?: string;
  creativeName?: string;
  creativeType?: CreativeAssetType;
  thumbnailUrl?: string;
  imageUrl?: string;
  campaignStatus?: string;
  /** Chave do ARQUIVO (video_id / image_hash) para deduplicar o mesmo criativo. */
  mediaKey?: string;
};

/** Identifica o arquivo do criativo (vídeo ou imagem) a partir do object_story_spec. */
function extractMediaKeyFromStorySpec(spec?: Record<string, unknown>): string | undefined {
  if (!spec) return undefined;
  const video = spec.video_data as Record<string, unknown> | undefined;
  if (typeof video?.video_id === "string") return `v:${video.video_id}`;
  const link = spec.link_data as Record<string, unknown> | undefined;
  if (typeof link?.image_hash === "string") return `i:${link.image_hash}`;
  const photo = spec.photo_data as Record<string, unknown> | undefined;
  if (typeof photo?.image_hash === "string") return `i:${photo.image_hash}`;
  if (typeof video?.image_hash === "string") return `i:${video.image_hash}`;
  return undefined;
}

/** Anúncios de uma conta com criativo + conjunto + campanha (para rastrear criativos). */
const AD_USAGE_FIELDS =
  "id,name,status,adset{id,name},campaign{id,name,effective_status},creative{id,name,thumbnail_url,image_url,object_story_spec}";

type RawAdUsage = {
  id: string;
  name?: string;
  status?: string;
  adset?: { id?: string; name?: string };
  campaign?: { id?: string; name?: string; effective_status?: string };
  creative?: {
    id?: string;
    name?: string;
    thumbnail_url?: string;
    image_url?: string;
    object_story_spec?: Record<string, unknown>;
  };
};

function mapAdUsageRow(r: RawAdUsage): AdUsageRow {
  const spec = r.creative?.object_story_spec;
  const linkData = spec?.link_data as Record<string, unknown> | undefined;
  const photoData = spec?.photo_data as Record<string, unknown> | undefined;
  const videoData = spec?.video_data as Record<string, unknown> | undefined;
  const fromSpec =
    (typeof linkData?.picture === "string" ? (linkData.picture as string) : undefined) ??
    (typeof photoData?.url === "string" ? (photoData.url as string) : undefined) ??
    (typeof videoData?.image_url === "string" ? (videoData.image_url as string) : undefined);
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    adsetId: r.adset?.id,
    adsetName: r.adset?.name,
    campaignId: r.campaign?.id,
    campaignName: r.campaign?.name,
    campaignStatus: r.campaign?.effective_status,
    creativeId: r.creative?.id,
    creativeName: r.creative?.name,
    creativeType: spec ? inferCreativeTypeFromStorySpec(spec) : "image",
    thumbnailUrl: r.creative?.thumbnail_url,
    imageUrl: r.creative?.image_url ?? fromSpec ?? r.creative?.thumbnail_url,
    mediaKey: extractMediaKeyFromStorySpec(spec)
  };
}

export async function fetchAdsWithUsageForAccount(
  accessToken: string,
  adAccountId: string
): Promise<AdUsageRow[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const path = `/${encodeURIComponent(act)}/ads?fields=${encodeURIComponent(AD_USAGE_FIELDS)}&limit=500`;
  const rows = await fetchGraphPaged<RawAdUsage>(path, accessToken);
  return rows.map(mapAdUsageRow);
}

/** Anúncios de uma campanha (mesma forma do account), para a aba de criativos da campanha. */
export async function fetchAdsWithUsageForCampaign(
  accessToken: string,
  campaignId: string
): Promise<AdUsageRow[]> {
  const path = `/${encodeURIComponent(campaignId)}/ads?fields=${encodeURIComponent(AD_USAGE_FIELDS)}&limit=500`;
  const rows = await fetchGraphPaged<RawAdUsage>(path, accessToken);
  return rows.map(mapAdUsageRow);
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
