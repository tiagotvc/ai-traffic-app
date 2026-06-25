import "server-only";

import { z } from "zod";

import {
  AudienceTargetingBriefSchema,
  generateAudiencePersonaPreview,
  generateAudienceTargetingSuggestion
} from "@/lib/audience-targeting-ai";
import { AiCampaignWizardGenerateSchema, wizardNeedsAudiencePrep, wizardNeedsRegionsPrep } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import { isTemporaryLlmError } from "@/lib/llm/generate-json";
import { getApiKeyForProvider, getLlmProvidersStatus } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";
import { fetchCustomAudiences } from "@/lib/meta-graph";
import type { ZoneAiPreview } from "@/lib/zone-targeting-ai";
import { generateZoneAiPreview, geocodeZonePreview } from "@/lib/zone-targeting-ai";

type WizardBody = z.infer<typeof AiCampaignWizardGenerateSchema>;

export const AiWizardPreparePhaseSchema = z.enum([
  "audience_preview",
  "audience_targeting",
  "regions_preview",
  "regions_geocode"
]);

export const AiWizardPrepareRequestSchema = AiCampaignWizardGenerateSchema.extend({
  phase: AiWizardPreparePhaseSchema
});

export function resolveWizardLlmProvider(preferred: LlmProviderId = "claude"): LlmProviderId {
  const status = getLlmProvidersStatus();
  if (preferred === "claude" && status.claude) return "claude";
  if (preferred === "gemini" && status.gemini) return "gemini";
  if (status.claude) return "claude";
  if (status.gemini) return "gemini";
  throw new Error("IA não configurada. Defina ANTHROPIC_API_KEY ou GEMINI_API_KEY no servidor.");
}

export function assertWizardProviderConfigured(preferred: LlmProviderId = "claude"): LlmProviderId {
  const provider = resolveWizardLlmProvider(preferred);
  if (!getApiKeyForProvider(provider)) {
    throw new Error(
      provider === "claude"
        ? "IA não configurada. Defina ANTHROPIC_API_KEY no servidor."
        : "IA não configurada. Defina GEMINI_API_KEY no servidor."
    );
  }
  return provider;
}

async function withProviderFallback<T>(
  preferred: LlmProviderId,
  fn: (provider: LlmProviderId) => Promise<T>
): Promise<{ result: T; provider: LlmProviderId }> {
  const status = getLlmProvidersStatus();
  const order: LlmProviderId[] =
    preferred === "claude"
      ? [...(status.claude ? (["claude"] as const) : []), ...(status.gemini ? (["gemini"] as const) : [])]
      : [...(status.gemini ? (["gemini"] as const) : []), ...(status.claude ? (["claude"] as const) : [])];

  if (!order.length) {
    throw new Error("IA não configurada. Defina ANTHROPIC_API_KEY ou GEMINI_API_KEY no servidor.");
  }

  let lastErr: unknown;
  for (const provider of order) {
    try {
      const result = await fn(provider);
      return { result, provider };
    } catch (e) {
      lastErr = e;
      if (order.length > 1 && isTemporaryLlmError(e)) continue;
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Serviço de IA temporariamente indisponível.");
}

function audienceBriefFromBody(body: WizardBody) {
  const businessDescription = body.businessDescription?.trim() ?? "";
  const targetProfile = body.targetProfile?.trim() ?? "";
  if (businessDescription.length < 3 || targetProfile.length < 3) {
    throw new Error("Preencha o que vende e para quem (mín. 3 caracteres).");
  }
  return AudienceTargetingBriefSchema.parse({
    businessDescription,
    targetProfile,
    countries: ["BR"],
    includeCustomAudienceIds: [],
    excludeCustomAudienceIds: [],
    rejectedSegmentIds: [],
    rejectedSegments: []
  });
}

export async function prepareWizardAudiencePreview(args: {
  body: WizardBody;
}): Promise<{ body: WizardBody; provider: LlmProviderId }> {
  const preferred = resolveWizardLlmProvider((args.body.provider as LlmProviderId) ?? "claude");
  const brief = audienceBriefFromBody(args.body);
  const { result: preview, provider } = await withProviderFallback(preferred, (p) =>
    generateAudiencePersonaPreview({ provider: p, brief })
  );
  return {
    body: { ...args.body, provider, audiencePreview: preview },
    provider
  };
}

export async function prepareWizardAudienceTargeting(args: {
  body: WizardBody;
  accessToken: string;
  clientName?: string;
}): Promise<{ body: WizardBody; provider: LlmProviderId }> {
  const preview = args.body.audiencePreview;
  if (!preview) {
    throw new Error("Prévia de público ausente. Execute a etapa de entendimento do público primeiro.");
  }

  const preferred = resolveWizardLlmProvider((args.body.provider as LlmProviderId) ?? "claude");
  const brief = audienceBriefFromBody(args.body);
  const audiences = await fetchCustomAudiences(args.accessToken, args.body.adAccountId).catch(() => []);
  const { result: suggestion, provider } = await withProviderFallback(preferred, (p) =>
    generateAudienceTargetingSuggestion({
      accessToken: args.accessToken,
      adAccountId: args.body.adAccountId,
      provider: p,
      brief,
      persona: preview,
      clientName: args.clientName,
      customAudiences: audiences.map((a) => ({
        id: a.id,
        name: a.name,
        subtype: a.subtype
      }))
    })
  );

  return {
    body: { ...args.body, provider, targetingSuggestion: suggestion },
    provider
  };
}

export async function prepareWizardRegionsPreview(args: {
  body: WizardBody;
}): Promise<{ body: WizardBody; provider: LlmProviderId; zoneAiPreview: ZoneAiPreview }> {
  const prompt = args.body.regionsDescription?.trim() ?? "";
  if (prompt.length < 3) {
    throw new Error("Descreva as regiões de atendimento (mín. 3 caracteres) ou selecione uma zona salva.");
  }

  const preferred = resolveWizardLlmProvider((args.body.provider as LlmProviderId) ?? "claude");
  const { result: zonePreview, provider } = await withProviderFallback(preferred, (p) =>
    generateZoneAiPreview({ provider: p, prompt, defaultRadiusKm: 5 })
  );

  return {
    body: {
      ...args.body,
      provider,
      zonePreview: {
        zoneName: zonePreview.zoneName,
        summary: zonePreview.summary,
        places: zonePreview.places
      }
    },
    provider,
    zoneAiPreview: zonePreview
  };
}

export async function prepareWizardRegionsGeocode(args: {
  body: WizardBody;
  zoneAiPreview?: ZoneAiPreview;
}): Promise<{ body: WizardBody; provider: LlmProviderId }> {
  const zoneAiPreview =
    args.zoneAiPreview ??
    (args.body.zonePreview
      ? ({
          zoneName: args.body.zonePreview.zoneName,
          summary: args.body.zonePreview.summary,
          places: args.body.zonePreview.places,
          provider: (args.body.provider as LlmProviderId) ?? "claude",
          modelUsed: ""
        } satisfies ZoneAiPreview)
      : null);

  if (!zoneAiPreview) {
    throw new Error("Prévia de regiões ausente. Execute a etapa de entendimento das regiões primeiro.");
  }

  const geocoded = await geocodeZonePreview(zoneAiPreview);
  const provider = (args.body.provider as LlmProviderId) ?? zoneAiPreview.provider ?? "claude";

  return {
    body: {
      ...args.body,
      provider,
      zonePreview: {
        zoneName: zoneAiPreview.zoneName,
        summary: zoneAiPreview.summary,
        places: zoneAiPreview.places
      },
      zoneGeoRules: geocoded.geoRules,
      zoneResolvedName: geocoded.name
    },
    provider
  };
}

export async function runWizardPreparePhase(args: {
  phase: z.infer<typeof AiWizardPreparePhaseSchema>;
  body: WizardBody;
  accessToken: string;
  clientName?: string;
}): Promise<{ body: WizardBody; provider: LlmProviderId }> {
  switch (args.phase) {
    case "audience_preview":
      return prepareWizardAudiencePreview({ body: args.body });
    case "audience_targeting":
      return prepareWizardAudienceTargeting({
        body: args.body,
        accessToken: args.accessToken,
        clientName: args.clientName
      });
    case "regions_preview": {
      const { body, provider } = await prepareWizardRegionsPreview({ body: args.body });
      return { body, provider };
    }
    case "regions_geocode":
      return prepareWizardRegionsGeocode({ body: args.body });
  }
}

export async function prepareWizardAiInputs(args: {
  body: WizardBody;
  accessToken: string;
  clientName?: string;
}): Promise<{ body: WizardBody; provider: LlmProviderId }> {
  let body = { ...args.body };
  let provider = resolveWizardLlmProvider((body.provider as LlmProviderId) ?? "claude");

  if (wizardNeedsAudiencePrep(body)) {
    const preview = await prepareWizardAudiencePreview({ body: { ...body, provider } });
    body = preview.body;
    provider = preview.provider;
    const targeting = await prepareWizardAudienceTargeting({
      body,
      accessToken: args.accessToken,
      clientName: args.clientName
    });
    body = targeting.body;
    provider = targeting.provider;
  }

  if (wizardNeedsRegionsPrep(body)) {
    const regionsPreview = await prepareWizardRegionsPreview({ body: { ...body, provider } });
    body = regionsPreview.body;
    provider = regionsPreview.provider;
    const geocoded = await prepareWizardRegionsGeocode({
      body,
      zoneAiPreview: regionsPreview.zoneAiPreview
    });
    body = geocoded.body;
    provider = geocoded.provider;
  }

  return { body, provider };
}
