import "server-only";

import type { Client } from "@/db/entities/Client";
import type { ClientMetaSettings, ClientTargeting } from "@/db/entities/ClientMetaSettings";
import { repositories } from "@/db/repositories";
import { getClientBySlugOrId } from "@/lib/app-context";
import { resolveMetaPublishConfig } from "@/lib/client-publish-config";

export type ResolvedClientMeta = {
  publish: ReturnType<typeof resolveMetaPublishConfig>;
  settings: ClientMetaSettings;
};

const DEFAULT_TARGETING: ClientTargeting = {
  countries: ["BR"],
  age_min: 18,
  age_max: 65,
  languages: []
};

export async function getOrCreateClientMetaSettings(clientId: string): Promise<ClientMetaSettings> {
  const { clientMetaSettings: repo } = await repositories();
  let row = await repo.findOne({ where: { clientId } });
  if (!row) {
    row = repo.create({
      clientId,
      targeting: DEFAULT_TARGETING,
      specialAdCategories: [],
      defaultCustomAudienceIds: [],
      defaultExcludedAudienceIds: [],
      // sensible defaults for dashboard
      defaultDashboardMetrics: ["spend", "conversions"],
      defaultClientMetric: "roas"
    });
    await repo.save(row);
  }
  return row;
}

export async function getResolvedClientMeta(
  tenantId: string,
  clientIdOrSlug: string
): Promise<ResolvedClientMeta | null> {
  const client = await getClientBySlugOrId(tenantId, clientIdOrSlug);
  if (!client) return null;
  const settings = await getOrCreateClientMetaSettings(client.id);
  const publish = resolveMetaPublishConfig(client);
  return { publish, settings };
}

export function buildTargetingFromSettings(settings: ClientMetaSettings) {
  const t = settings.targeting ?? DEFAULT_TARGETING;
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: t.countries?.length ? t.countries : ["BR"] },
    age_min: t.age_min ?? 18,
    age_max: t.age_max ?? 65
  };
  if (t.languages?.length) targeting.locales = t.languages;

  const include = settings.defaultCustomAudienceIds?.filter(Boolean) ?? [];
  const exclude = settings.defaultExcludedAudienceIds?.filter(Boolean) ?? [];
  if (include.length) targeting.custom_audiences = include.map((id) => ({ id }));
  if (exclude.length) targeting.excluded_custom_audiences = exclude.map((id) => ({ id }));

  return targeting;
}

export function priorityToNumber(p: string): number {
  if (p === "critical") return 10;
  if (p === "low") return 90;
  return 50;
}

export async function listClientIdsForUser(tenantId: string, userId: string): Promise<string[] | null> {
  const { userClient: ucRepo, client: clientRepo } = await repositories();
  const allInTenant = await clientRepo.find({ where: { tenantId }, select: { id: true } });
  const tenantIds = allInTenant.map((c) => c.id);
  if (!tenantIds.length) return [];

  const links = await ucRepo.find({ where: { userId } });
  if (links.length === 0) return tenantIds;

  const tenantSet = new Set(tenantIds);
  const scoped = links.map((l) => l.clientId).filter((id) => tenantSet.has(id));
  return scoped.length > 0 ? scoped : tenantIds;
}

export type ClientMetaSettingsPatch = Partial<{
  defaultAdAccountId: string | null;
  metaPixelId: string | null;
  metaLeadFormId: string | null;
  instagramActorId: string | null;
  defaultObjective: string;
  defaultCta: string;
  defaultDailyBudgetBrl: number | null;
  targeting: ClientTargeting;
  specialAdCategories: string[];
  campaignNamePrefix: string | null;
  syncEnabled: boolean;
  syncPriority: string;
  defaultCustomAudienceIds: string[];
  defaultExcludedAudienceIds: string[];
  automationEnabled: boolean;
  targetingTemplateName: string | null;
  metaPageId: string | null;
  metaLinkUrl: string | null;
  // new dashboard preferences
  defaultDashboardMetrics: string[];
  defaultClientMetric: string | null;
  defaultUtm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  } | null;
  commercialAddress: string | null;
  commercialAddressNormalized: string | null;
  commercialLatitude: number | null;
  commercialLongitude: number | null;
  aiEnabled: boolean;
  aiMonthlyCap: number | null;
}>;

export async function patchClientMetaSettings(
  client: Client,
  patch: ClientMetaSettingsPatch
): Promise<ClientMetaSettings> {
  const { client: clientRepo, clientMetaSettings: settingsRepo } = await repositories();
  const settings = await getOrCreateClientMetaSettings(client.id);

  if (patch.metaPageId !== undefined) client.metaPageId = patch.metaPageId?.trim() || null;
  if (patch.metaLinkUrl !== undefined) client.metaLinkUrl = patch.metaLinkUrl?.trim() || null;
  if (patch.metaPageId !== undefined || patch.metaLinkUrl !== undefined) {
    await clientRepo.save(client);
  }

  Object.assign(settings, {
    ...(patch.defaultAdAccountId !== undefined && {
      defaultAdAccountId: patch.defaultAdAccountId?.trim() || null
    }),
    ...(patch.metaPixelId !== undefined && { metaPixelId: patch.metaPixelId?.trim() || null }),
    ...(patch.metaLeadFormId !== undefined && {
      metaLeadFormId: patch.metaLeadFormId?.trim() || null
    }),
    ...(patch.instagramActorId !== undefined && {
      instagramActorId: patch.instagramActorId?.trim() || null
    }),
    ...(patch.defaultObjective !== undefined && { defaultObjective: patch.defaultObjective }),
    ...(patch.defaultCta !== undefined && { defaultCta: patch.defaultCta }),
    ...(patch.defaultDailyBudgetBrl !== undefined && {
      defaultDailyBudgetBrl:
        patch.defaultDailyBudgetBrl === null ? null : String(patch.defaultDailyBudgetBrl)
    }),
    ...(patch.targeting !== undefined && { targeting: patch.targeting }),
    ...(patch.specialAdCategories !== undefined && { specialAdCategories: patch.specialAdCategories }),
    ...(patch.campaignNamePrefix !== undefined && {
      campaignNamePrefix: patch.campaignNamePrefix?.trim() || null
    }),
    ...(patch.syncEnabled !== undefined && { syncEnabled: patch.syncEnabled }),
    ...(patch.syncPriority !== undefined && { syncPriority: patch.syncPriority }),
    ...(patch.defaultCustomAudienceIds !== undefined && {
      defaultCustomAudienceIds: patch.defaultCustomAudienceIds
    }),
    ...(patch.defaultExcludedAudienceIds !== undefined && {
      defaultExcludedAudienceIds: patch.defaultExcludedAudienceIds
    }),
    ...(patch.automationEnabled !== undefined && { automationEnabled: patch.automationEnabled }),
    ...(patch.targetingTemplateName !== undefined && {
      targetingTemplateName: patch.targetingTemplateName?.trim() || null
    }),
    ...(patch.defaultDashboardMetrics !== undefined && { defaultDashboardMetrics: patch.defaultDashboardMetrics }),
    ...(patch.defaultClientMetric !== undefined && { defaultClientMetric: patch.defaultClientMetric }),
    ...(patch.defaultUtm !== undefined && { defaultUtm: patch.defaultUtm }),
    ...(patch.commercialAddress !== undefined && {
      commercialAddress: patch.commercialAddress?.trim() || null
    }),
    ...(patch.commercialAddressNormalized !== undefined && {
      commercialAddressNormalized: patch.commercialAddressNormalized?.trim() || null
    }),
    ...(patch.commercialLatitude !== undefined && { commercialLatitude: patch.commercialLatitude }),
    ...(patch.commercialLongitude !== undefined && { commercialLongitude: patch.commercialLongitude }),
    ...(patch.aiEnabled !== undefined && { aiEnabled: patch.aiEnabled }),
    ...(patch.aiMonthlyCap !== undefined && {
      aiMonthlyCap: patch.aiMonthlyCap === null ? null : Math.max(0, patch.aiMonthlyCap)
    }),
    updatedAt: new Date()
  });

  return settingsRepo.save(settings);
}
