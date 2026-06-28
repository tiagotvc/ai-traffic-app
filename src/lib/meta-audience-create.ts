import "server-only";

import {
  createLookalikeAudience,
  fetchAdVideos,
  fetchInstagramVideoMedia,
  fetchLeadGenForms,
  fetchPageVideos,
  metaFetch,
  metaPost,
  STANDARD_CONVERSION_EVENTS
} from "@/lib/meta-graph";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";

// ---- Catalogs (Meta Ads Manager parity) ----

export const WEBSITE_MAX_RETENTION_DAYS = 180;

export const WEBSITE_PIXEL_EVENTS = [
  { id: "PageView", labelKey: "websiteEvent.pageView", metaEvent: "PageView" },
  { id: "ViewContent", labelKey: "websiteEvent.viewContent", metaEvent: "ViewContent" },
  { id: "Search", labelKey: "websiteEvent.search", metaEvent: "Search" },
  { id: "AddToCart", labelKey: "websiteEvent.addToCart", metaEvent: "AddToCart" },
  { id: "InitiateCheckout", labelKey: "websiteEvent.initiateCheckout", metaEvent: "InitiateCheckout" },
  { id: "AddPaymentInfo", labelKey: "websiteEvent.addPaymentInfo", metaEvent: "AddPaymentInfo" },
  { id: "Purchase", labelKey: "websiteEvent.purchase", metaEvent: "Purchase" },
  { id: "Lead", labelKey: "websiteEvent.lead", metaEvent: "Lead" },
  { id: "CompleteRegistration", labelKey: "websiteEvent.completeRegistration", metaEvent: "CompleteRegistration" }
] as const;

export type EngagementSourceType = "page" | "ig_business" | "video" | "lead";

export const ENGAGEMENT_SOURCES: Array<{
  id: EngagementSourceType;
  labelKey: string;
  eventSourceType: string;
  maxRetentionDays: number;
}> = [
  { id: "page", labelKey: "engagementSource.page", eventSourceType: "page", maxRetentionDays: 365 },
  { id: "ig_business", labelKey: "engagementSource.ig", eventSourceType: "ig_business", maxRetentionDays: 365 },
  { id: "video", labelKey: "engagementSource.video", eventSourceType: "video", maxRetentionDays: 365 },
  { id: "lead", labelKey: "engagementSource.lead", eventSourceType: "lead", maxRetentionDays: 90 }
];

export type EngagementActionDef = {
  id: string;
  labelKey: string;
  metaEvent: string;
  maxRetentionDays: number;
  /** page_liked has no retention window in Meta */
  fixedRetentionSeconds?: number;
};

export const ENGAGEMENT_ACTIONS: Record<EngagementSourceType, EngagementActionDef[]> = {
  page: [
    { id: "page_engaged", labelKey: "engagementAction.pageEngaged", metaEvent: "page_engaged", maxRetentionDays: 730 },
    { id: "page_visited", labelKey: "engagementAction.pageVisited", metaEvent: "page_visited", maxRetentionDays: 730 },
    { id: "page_messaged", labelKey: "engagementAction.pageMessaged", metaEvent: "page_messaged", maxRetentionDays: 730 },
    { id: "page_cta_clicked", labelKey: "engagementAction.pageCtaClicked", metaEvent: "page_cta_clicked", maxRetentionDays: 730 },
    { id: "page_or_post_save", labelKey: "engagementAction.pageOrPostSave", metaEvent: "page_or_post_save", maxRetentionDays: 730 },
    {
      id: "page_post_interaction",
      labelKey: "engagementAction.pagePostInteraction",
      metaEvent: "page_post_interaction",
      maxRetentionDays: 730
    }
  ],
  ig_business: [
    {
      id: "ig_business_profile_all",
      labelKey: "engagementAction.igProfileAll",
      metaEvent: "ig_business_profile_all",
      maxRetentionDays: 365
    },
    {
      id: "ig_business_profile_engaged",
      labelKey: "engagementAction.igProfileEngaged",
      metaEvent: "ig_business_profile_engaged",
      maxRetentionDays: 365
    },
    {
      id: "ig_business_profile_visit",
      labelKey: "engagementAction.igProfileVisit",
      metaEvent: "ig_business_profile_visit",
      maxRetentionDays: 365
    },
    {
      id: "ig_user_messaged_business",
      labelKey: "engagementAction.igMessaged",
      metaEvent: "ig_user_messaged_business",
      maxRetentionDays: 365
    },
    {
      id: "ig_business_profile_ad_saved",
      labelKey: "engagementAction.igAdSaved",
      metaEvent: "ig_business_profile_ad_saved",
      maxRetentionDays: 365
    },
    { id: "ig_ad_like", labelKey: "engagementAction.igAdLike", metaEvent: "ig_ad_like", maxRetentionDays: 365 },
    { id: "ig_ad_comment", labelKey: "engagementAction.igAdComment", metaEvent: "ig_ad_comment", maxRetentionDays: 365 },
    { id: "ig_ad_share", labelKey: "engagementAction.igAdShare", metaEvent: "ig_ad_share", maxRetentionDays: 365 },
    { id: "ig_ad_save", labelKey: "engagementAction.igAdSave", metaEvent: "ig_ad_save", maxRetentionDays: 365 },
    { id: "ig_ad_cta_click", labelKey: "engagementAction.igAdCtaClick", metaEvent: "ig_ad_cta_click", maxRetentionDays: 365 },
    {
      id: "ig_ad_carousel_swipe",
      labelKey: "engagementAction.igAdCarouselSwipe",
      metaEvent: "ig_ad_carousel_swipe",
      maxRetentionDays: 365
    },
    { id: "ig_organic_like", labelKey: "engagementAction.igOrganicLike", metaEvent: "ig_organic_like", maxRetentionDays: 365 },
    {
      id: "ig_organic_comment",
      labelKey: "engagementAction.igOrganicComment",
      metaEvent: "ig_organic_comment",
      maxRetentionDays: 365
    },
    { id: "ig_organic_share", labelKey: "engagementAction.igOrganicShare", metaEvent: "ig_organic_share", maxRetentionDays: 365 },
    { id: "ig_organic_save", labelKey: "engagementAction.igOrganicSave", metaEvent: "ig_organic_save", maxRetentionDays: 365 },
    {
      id: "ig_organic_carousel_swipe",
      labelKey: "engagementAction.igOrganicCarouselSwipe",
      metaEvent: "ig_organic_carousel_swipe",
      maxRetentionDays: 365
    }
  ],
  video: [
    { id: "video_view", labelKey: "engagementAction.videoView", metaEvent: "video_view", maxRetentionDays: 365 },
    { id: "video_view_3s", labelKey: "engagementAction.videoView3s", metaEvent: "video_view_3s", maxRetentionDays: 365 },
    { id: "video_view_10s", labelKey: "engagementAction.videoView10s", metaEvent: "video_view_10s", maxRetentionDays: 365 },
    { id: "video_view_15s", labelKey: "engagementAction.videoView15s", metaEvent: "video_view_15s", maxRetentionDays: 365 },
    { id: "video_view_25", labelKey: "engagementAction.videoView25", metaEvent: "video_view_25", maxRetentionDays: 365 },
    { id: "video_view_50", labelKey: "engagementAction.videoView50", metaEvent: "video_view_50", maxRetentionDays: 365 },
    { id: "video_view_75", labelKey: "engagementAction.videoView75", metaEvent: "video_view_75", maxRetentionDays: 365 },
    { id: "video_view_95", labelKey: "engagementAction.videoView95", metaEvent: "video_view_95", maxRetentionDays: 365 },
    {
      id: "video_completed",
      labelKey: "engagementAction.videoCompleted",
      metaEvent: "video_completed",
      maxRetentionDays: 365
    }
  ],
  lead: [
    {
      id: "lead_generation_opened",
      labelKey: "engagementAction.leadOpened",
      metaEvent: "lead_generation_opened",
      maxRetentionDays: 90
    },
    {
      id: "lead_generation_submitted",
      labelKey: "engagementAction.leadSubmitted",
      metaEvent: "lead_generation_submitted",
      maxRetentionDays: 90
    },
    {
      id: "lead_generation_dropoff",
      labelKey: "engagementAction.leadDropoff",
      metaEvent: "lead_generation_dropoff",
      maxRetentionDays: 90
    }
  ]
};

export function findEngagementAction(
  sourceType: EngagementSourceType,
  metaEvent: string
): EngagementActionDef | undefined {
  return ENGAGEMENT_ACTIONS[sourceType]?.find((a) => a.metaEvent === metaEvent);
}

export const LOOKALIKE_RATIOS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1] as const;

export const LOOKALIKE_COUNTRIES = [
  "BR",
  "US",
  "PT",
  "MX",
  "AR",
  "CO",
  "CL",
  "PE",
  "ES",
  "CA",
  "GB",
  "DE",
  "FR",
  "IT"
] as const;

export { STANDARD_CONVERSION_EVENTS };

// ---- Rule builders ----

function retentionSeconds(days: number): number {
  return Math.round(days * 86400);
}

/**
 * Coerces a value into a Meta-valid Custom Audience event name: at most 49
 * characters, only `[A-Za-z0-9_]`. Standard tokens (`PageView`, `Purchase`)
 * pass through unchanged; display names with spaces/accents/hyphens are
 * normalized so Meta doesn't reject them with error #2654.
 */
export function sanitizeMetaEventName(raw: string): string {
  const cleaned = (raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (cleaned || "Other").slice(0, 49);
}

export function buildWebsiteAudienceRule(input: {
  pixelId: string;
  eventName: string;
  retentionDays: number;
  urlContains?: string;
}): Record<string, unknown> {
  const filters: Array<Record<string, unknown>> = [];
  if (input.urlContains?.trim()) {
    filters.push({
      field: "url",
      operator: "i_contains",
      value: input.urlContains.trim()
    });
  }

  const rule: Record<string, unknown> = {
    event_sources: [{ id: input.pixelId, type: "pixel" }],
    retention_seconds: retentionSeconds(input.retentionDays),
    event: { event_name: sanitizeMetaEventName(input.eventName) }
  };

  if (filters.length) {
    rule.filter = { operator: "and", filters };
  }

  return {
    inclusions: {
      operator: "or",
      rules: [rule]
    }
  };
}

export function buildEngagementAudienceRule(input: {
  sourceType: EngagementSourceType;
  sourceIds: string[];
  eventName: string;
  retentionDays: number;
}): Record<string, unknown> {
  const sourceDef = ENGAGEMENT_SOURCES.find((s) => s.id === input.sourceType);
  const eventSourceType = sourceDef?.eventSourceType ?? input.sourceType;
  const ids = input.sourceIds.map((id) => id.trim()).filter(Boolean);
  if (!ids.length) throw new Error("Selecione ao menos uma fonte de engajamento");

  const action = findEngagementAction(input.sourceType, input.eventName);
  const retention =
    action?.fixedRetentionSeconds !== undefined
      ? action.fixedRetentionSeconds
      : retentionSeconds(
          Math.min(input.retentionDays, action?.maxRetentionDays ?? input.retentionDays)
        );

  return {
    inclusions: {
      operator: "or",
      rules: [
        {
          event_sources: ids.map((id) => ({ id, type: eventSourceType })),
          retention_seconds: retention,
          filter: {
            operator: "and",
            filters: [{ field: "event", operator: "eq", value: sanitizeMetaEventName(input.eventName) }]
          }
        }
      ]
    }
  };
}

export function buildCombinedAudienceRule(input: {
  includeAudienceIds: string[];
  excludeAudienceIds?: string[];
}): Record<string, unknown> {
  const rule: Record<string, unknown> = {
    inclusions: {
      operator: "or",
      rules: input.includeAudienceIds.map((id) => ({
        event_sources: [{ id, type: "custom_audience" }]
      }))
    }
  };

  if (input.excludeAudienceIds?.length) {
    rule.exclusions = {
      operator: "or",
      rules: input.excludeAudienceIds.map((id) => ({
        event_sources: [{ id, type: "custom_audience" }]
      }))
    };
  }

  return rule;
}

function actId(adAccountId: string): string {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

// ---- Create functions ----

export async function createWebsiteCustomAudience(
  accessToken: string,
  adAccountId: string,
  input: {
    name: string;
    pixelId: string;
    eventName: string;
    retentionDays: number;
    urlContains?: string;
  }
): Promise<{ id: string }> {
  const days = Math.min(Math.max(1, input.retentionDays), WEBSITE_MAX_RETENTION_DAYS);
  const rule = buildWebsiteAudienceRule({ ...input, retentionDays: days });

  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/customaudiences`, accessToken, {
    name: input.name,
    subtype: "WEBSITE",
    retention_days: String(days),
    rule: JSON.stringify(rule)
  });
}

export async function createEngagementCustomAudience(
  accessToken: string,
  adAccountId: string,
  input: {
    name: string;
    sourceType: EngagementSourceType;
    sourceIds: string[];
    eventName: string;
    retentionDays: number;
  }
): Promise<{ id: string }> {
  const actionDef = findEngagementAction(input.sourceType, input.eventName);
  if (!actionDef) throw new Error("Ação de engajamento inválida");

  const maxDays = actionDef.maxRetentionDays || 365;
  const days =
    actionDef.fixedRetentionSeconds !== undefined
      ? 0
      : Math.min(Math.max(1, input.retentionDays), maxDays);

  const rule = buildEngagementAudienceRule({ ...input, retentionDays: days });
  const subtype = input.sourceType === "video" ? "VIDEO" : "ENGAGEMENT";

  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/customaudiences`, accessToken, {
    name: input.name,
    subtype,
    rule: JSON.stringify(rule),
    prefill: "1"
  });
}

export async function createCombinedCustomAudience(
  accessToken: string,
  adAccountId: string,
  input: {
    name: string;
    includeAudienceIds: string[];
    excludeAudienceIds?: string[];
  }
): Promise<{ id: string }> {
  if (!input.includeAudienceIds.length) {
    throw new Error("Selecione ao menos um público para incluir");
  }

  const rule = buildCombinedAudienceRule(input);

  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/customaudiences`, accessToken, {
    name: input.name,
    subtype: "CUSTOM",
    rule: JSON.stringify(rule)
  });
}

export type MetaSavedAudience = {
  id: string;
  name?: string;
  targeting?: Record<string, unknown>;
  time_created?: string;
  time_updated?: string;
};

export async function fetchSavedAudiences(
  accessToken: string,
  adAccountId: string
): Promise<MetaSavedAudience[]> {
  const fields = ["id", "name", "targeting", "time_created", "time_updated"].join(",");
  const data = await metaFetch<{ data: MetaSavedAudience[] }>(
    `/${encodeURIComponent(actId(adAccountId))}/saved_audiences?fields=${encodeURIComponent(fields)}&limit=100`,
    accessToken
  );
  return data.data ?? [];
}

export async function createSavedAudience(
  accessToken: string,
  adAccountId: string,
  input: { name: string; targeting: Record<string, unknown> }
): Promise<{ id: string }> {
  const targeting = sanitizeTargetingForMeta(input.targeting);
  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/saved_audiences`, accessToken, {
    name: input.name.trim(),
    targeting: JSON.stringify(targeting)
  });
}

export async function createSavedAudienceFromTemplate(
  accessToken: string,
  adAccountId: string,
  input: { name: string; templateAudienceId: string }
): Promise<{ id: string }> {
  const audiences = await fetchSavedAudiences(accessToken, adAccountId);
  const template = audiences.find((a) => a.id === input.templateAudienceId);
  if (!template?.targeting) {
    throw new Error("Público salvo modelo não encontrado ou sem targeting");
  }
  return createSavedAudience(accessToken, adAccountId, {
    name: input.name,
    targeting: sanitizeTargetingForMeta(template.targeting as Record<string, unknown>)
  });
}

export type MetaAdAccountApp = { id: string; name?: string };

export async function fetchAdAccountApps(
  accessToken: string,
  adAccountId: string
): Promise<MetaAdAccountApp[]> {
  try {
    const data = await metaFetch<{ data: MetaAdAccountApp[] }>(
      `/${encodeURIComponent(actId(adAccountId))}/applications?fields=id,name&limit=50`,
      accessToken
    );
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function createLookalikeBatch(
  accessToken: string,
  adAccountId: string,
  items: Array<{ name: string; originAudienceId: string; ratio: number; country: string }>,
  onProgress?: (index: number, result: { id: string } | { error: string }) => void
): Promise<Array<{ name: string; originAudienceId: string; ratio: number; country: string; id?: string; error?: string }>> {
  const results: Array<{
    name: string;
    originAudienceId: string;
    ratio: number;
    country: string;
    id?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    try {
      const created = await createLookalikeAudience(accessToken, adAccountId, {
        name: item.name,
        originAudienceId: item.originAudienceId,
        ratio: item.ratio,
        country: item.country
      });
      results.push({ ...item, id: created.id });
      onProgress?.(i, created);
    } catch (e) {
      const error = e instanceof Error ? e.message : "failed";
      results.push({ ...item, error });
      onProgress?.(i, { error });
    }
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

export type EngagementVideoOption = {
  id: string;
  title: string;
  picture?: string | null;
  origin: "ad_account" | "page" | "instagram";
  originId: string;
  originLabel: string;
};

/** Vídeos elegíveis para público de engajamento (conta, páginas e Instagram). */
export async function fetchEngagementVideoOptions(
  accessToken: string,
  adAccountId: string,
  pages: Array<{ id: string; name: string }>,
  instagramAccounts: Array<{ id: string; name: string }>
): Promise<EngagementVideoOption[]> {
  const out: EngagementVideoOption[] = [];
  const seen = new Set<string>();

  const push = (row: EngagementVideoOption) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    out.push(row);
  };

  try {
    const adVideos = await fetchAdVideos(accessToken, adAccountId);
    for (const v of adVideos) {
      push({
        id: v.id,
        title: v.title?.trim() || v.id,
        picture: v.picture ?? null,
        origin: "ad_account",
        originId: adAccountId,
        originLabel: "ad_account"
      });
    }
  } catch {
    /* best-effort */
  }

  await Promise.all(
    pages.map(async (p) => {
      try {
        const vids = await fetchPageVideos(accessToken, p.id);
        for (const v of vids) {
          push({
            id: v.id,
            title: v.title?.trim() || v.id,
            picture: v.picture ?? null,
            origin: "page",
            originId: p.id,
            originLabel: p.name
          });
        }
      } catch {
        /* skip page */
      }
    })
  );

  await Promise.all(
    instagramAccounts.map(async (ig) => {
      try {
        const media = await fetchInstagramVideoMedia(accessToken, ig.id);
        for (const m of media) {
          const caption = m.caption?.trim();
          push({
            id: m.id,
            title: caption ? caption.slice(0, 80) : m.id,
            picture: m.thumbnail_url ?? null,
            origin: "instagram",
            originId: ig.id,
            originLabel: ig.name
          });
        }
      } catch {
        /* skip ig */
      }
    })
  );

  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchEngagementLeadForms(
  accessToken: string,
  pages: Array<{ id: string; name: string }>
): Promise<Array<{ id: string; name: string; pageId: string; pageName: string }>> {
  const out: Array<{ id: string; name: string; pageId: string; pageName: string }> = [];
  const seen = new Set<string>();

  await Promise.all(
    pages.map(async (p) => {
      try {
        const forms = await fetchLeadGenForms(accessToken, p.id);
        for (const f of forms) {
          if (!f.id || seen.has(f.id)) continue;
          seen.add(f.id);
          out.push({
            id: f.id,
            name: f.name?.trim() || f.id,
            pageId: p.id,
            pageName: p.name
          });
        }
      } catch {
        /* skip */
      }
    })
  );

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Parse rule JSON for display in detail modal */
export { summarizeAudienceRule } from "@/lib/meta-audience-rule-summary";
