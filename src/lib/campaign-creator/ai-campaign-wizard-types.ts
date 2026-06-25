import { z } from "zod";

import type { ZoneGeoRules } from "@/db/entities/UserZone";
import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import {
  CAMPAIGN_OBJECTIVES,
  ConversionLocationSchema,
  MessagingChannelSchema,
  type BuyingType,
  type CampaignObjectiveKey,
  type ConversionLocation,
  type MessagingChannel
} from "@/lib/campaign-draft";

export const AI_WIZARD_STEPS = [
  "setup",
  "objective",
  "audience",
  "regions",
  "offer",
  "summary"
] as const;

export type AiWizardStepId = (typeof AI_WIZARD_STEPS)[number];

export type AudienceFitSuggestion = {
  id: string;
  source: "persona" | "meta";
  name: string;
  score: number;
  reason: string;
};

export type ZonePreviewPlace = {
  label: string;
  city?: string;
  state?: string;
  radiusKm?: number;
};

export type ZonePreviewData = {
  zoneName: string;
  summary: string;
  places: ZonePreviewPlace[];
};

export type AiCampaignWizardState = {
  clientSlug: string;
  adAccountId: string;
  buyingType: BuyingType;
  objective: CampaignObjectiveKey;
  audienceMode: "create" | "reuse";
  businessDescription: string;
  targetProfile: string;
  audiencePreview: AudiencePersonaPreview | null;
  targetingSuggestion: AudienceTargetingSuggestion | null;
  selectedPersonaId: string | null;
  selectedMetaAudienceId: string | null;
  personaFitSuggestions: AudienceFitSuggestion[];
  metaAudienceFitSuggestions: AudienceFitSuggestion[];
  regionsDescription: string;
  zonePreview: ZonePreviewData | null;
  zoneGeoRules: ZoneGeoRules | null;
  zoneResolvedName: string | null;
  selectedZoneId: string | null;
  productDescription: string;
  conversionLocation: ConversionLocation;
  messagingChannels: MessagingChannel[];
  linkUrl: string;
  dailyBudgetBRL: number;
};

export function defaultAiCampaignWizardState(
  partial?: Partial<AiCampaignWizardState>
): AiCampaignWizardState {
  return {
    clientSlug: "",
    adAccountId: "",
    buyingType: "auction",
    objective: "leads",
    audienceMode: "create",
    businessDescription: "",
    targetProfile: "",
    audiencePreview: null,
    targetingSuggestion: null,
    selectedPersonaId: null,
    selectedMetaAudienceId: null,
    personaFitSuggestions: [],
    metaAudienceFitSuggestions: [],
    regionsDescription: "",
    zonePreview: null,
    zoneGeoRules: null,
    zoneResolvedName: null,
    selectedZoneId: null,
    productDescription: "",
    conversionLocation: "website_and_form",
    messagingChannels: [],
    linkUrl: "",
    dailyBudgetBRL: 150,
    ...partial
  };
}

export function isAudienceStepValid(state: AiCampaignWizardState): boolean {
  if (state.audienceMode === "reuse") {
    return Boolean(state.selectedPersonaId || state.selectedMetaAudienceId);
  }
  return (
    state.businessDescription.trim().length >= 3 && state.targetProfile.trim().length >= 3
  );
}

export function isRegionsStepValid(state: AiCampaignWizardState): boolean {
  if (state.selectedZoneId) return true;
  return state.regionsDescription.trim().length >= 3;
}

export function wizardNeedsAudiencePrep(state: AiCampaignWizardState): boolean {
  return (
    state.audienceMode === "create" &&
    !state.selectedPersonaId &&
    !state.selectedMetaAudienceId &&
    (!state.audiencePreview || !state.targetingSuggestion)
  );
}

export function wizardNeedsRegionsPrep(state: AiCampaignWizardState): boolean {
  return !state.selectedZoneId && !state.zoneGeoRules;
}

export function isOfferStepValid(state: AiCampaignWizardState): boolean {
  if (!state.productDescription.trim() || state.dailyBudgetBRL < 1) return false;
  if (state.conversionLocation === "messaging") {
    return state.messagingChannels.length > 0;
  }
  if (
    state.conversionLocation === "website" ||
    state.conversionLocation === "website_and_form"
  ) {
    return Boolean(state.linkUrl.trim());
  }
  return true;
}

export const AiCampaignWizardGenerateSchema = z.object({
  clientSlug: z.string().min(1),
  adAccountId: z.string().min(1),
  locale: z.string().default("pt-BR"),
  provider: z.enum(["gemini", "claude"]).default("claude"),
  buyingType: z.enum(["auction", "reservation"]).default("auction"),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  audienceMode: z.enum(["create", "reuse"]),
  businessDescription: z.string().max(500).optional(),
  targetProfile: z.string().max(500).optional(),
  audiencePreview: z.record(z.string(), z.unknown()).nullable().optional(),
  targetingSuggestion: z.record(z.string(), z.unknown()).nullable().optional(),
  selectedPersonaId: z.string().nullable().optional(),
  selectedMetaAudienceId: z.string().nullable().optional(),
  regionsDescription: z.string().max(1000).optional(),
  zonePreview: z
    .object({
      zoneName: z.string(),
      summary: z.string(),
      places: z.array(
        z.object({
          label: z.string(),
          city: z.string().optional(),
          state: z.string().optional(),
          radiusKm: z.number().optional()
        })
      )
    })
    .nullable()
    .optional(),
  zoneGeoRules: z.record(z.string(), z.unknown()).nullable().optional(),
  zoneResolvedName: z.string().nullable().optional(),
  selectedZoneId: z.string().nullable().optional(),
  productDescription: z.string().min(3).max(2000),
  conversionLocation: ConversionLocationSchema,
  messagingChannels: z.array(MessagingChannelSchema).default([]),
  linkUrl: z.string().default(""),
  dailyBudgetBRL: z.number().positive()
});

export const AiAudienceMatchSchema = z.object({
  clientSlug: z.string().min(1),
  adAccountId: z.string().min(1),
  businessDescription: z.string().min(3).max(500),
  targetProfile: z.string().min(3).max(500),
  provider: z.enum(["gemini", "claude"]).default("claude")
});
