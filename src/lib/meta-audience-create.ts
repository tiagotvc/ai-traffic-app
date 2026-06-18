import "server-only";

import { createLookalikeAudience, metaFetch, metaPost, STANDARD_CONVERSION_EVENTS } from "@/lib/meta-graph";

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

export const ENGAGEMENT_ACTIONS: Record<
  EngagementSourceType,
  Array<{ id: string; labelKey: string; metaEvent: string; maxRetentionDays: number }>
> = {
  page: [
    { id: "page_engaged", labelKey: "engagementAction.pageEngaged", metaEvent: "page_engaged", maxRetentionDays: 365 },
    { id: "page_liked", labelKey: "engagementAction.pageLiked", metaEvent: "page_liked", maxRetentionDays: 365 },
    { id: "page_visited", labelKey: "engagementAction.pageVisited", metaEvent: "page_visited", maxRetentionDays: 365 },
    { id: "page_messaged", labelKey: "engagementAction.pageMessaged", metaEvent: "page_messaged", maxRetentionDays: 365 }
  ],
  ig_business: [
    {
      id: "ig_user_engaged",
      labelKey: "engagementAction.igEngaged",
      metaEvent: "ig_user_engaged",
      maxRetentionDays: 365
    },
    {
      id: "ig_business_profile_engaged",
      labelKey: "engagementAction.igProfileEngaged",
      metaEvent: "ig_business_profile_engaged",
      maxRetentionDays: 365
    },
    {
      id: "ig_user_messaged",
      labelKey: "engagementAction.igMessaged",
      metaEvent: "ig_user_messaged",
      maxRetentionDays: 365
    }
  ],
  video: [
    { id: "video_view", labelKey: "engagementAction.videoView", metaEvent: "video_view", maxRetentionDays: 365 },
    {
      id: "video_view_95",
      labelKey: "engagementAction.videoView95",
      metaEvent: "video_view_95",
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
    }
  ]
};

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
    event: { event_name: input.eventName }
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
  sourceId: string;
  eventName: string;
  retentionDays: number;
}): Record<string, unknown> {
  const sourceDef = ENGAGEMENT_SOURCES.find((s) => s.id === input.sourceType);
  const eventSourceType = sourceDef?.eventSourceType ?? input.sourceType;

  return {
    inclusions: {
      operator: "or",
      rules: [
        {
          event_sources: [{ id: input.sourceId, type: eventSourceType }],
          retention_seconds: retentionSeconds(input.retentionDays),
          event: { event_name: input.eventName }
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
    sourceId: string;
    eventName: string;
    retentionDays: number;
  }
): Promise<{ id: string }> {
  const actions = ENGAGEMENT_ACTIONS[input.sourceType] ?? [];
  const actionDef = actions.find((a) => a.metaEvent === input.eventName);
  const maxDays = actionDef?.maxRetentionDays ?? 365;
  const days = Math.min(Math.max(1, input.retentionDays), maxDays);
  const rule = buildEngagementAudienceRule({ ...input, retentionDays: days });

  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/customaudiences`, accessToken, {
    name: input.name,
    subtype: "ENGAGEMENT",
    rule: JSON.stringify(rule)
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
  return metaPost(`/${encodeURIComponent(actId(adAccountId))}/saved_audiences`, accessToken, {
    name: input.name,
    targeting: JSON.stringify(input.targeting)
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
    targeting: template.targeting
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

/** Parse rule JSON for display in detail modal */
export { summarizeAudienceRule } from "@/lib/meta-audience-rule-summary";
