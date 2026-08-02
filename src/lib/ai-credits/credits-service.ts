import "server-only";

import { repositories } from "@/db/repositories";
import { PlanLimitError } from "@/lib/billing/entitlements";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { GeminiGenerateMeta } from "@/lib/gemini";

import { AI_CREDIT_KIND_LABEL } from "./defaults";
import { getAiCreditWeights, getAiCreditsFeatureFlags, isAiCreditsV2Enabled } from "./feature-flags";
import { getClientAiSettings, getTenantAiPolicy } from "./policy-service";
import {
  buildAiCreditsUsage,
  countLegacyAiRequests,
  sumClientCreditsUsed,
  sumTenantCreditsUsed
} from "./usage-service";
import type { AiCreditKind, AiCreditsStatusDto } from "./types";
import { NextResponse } from "next/server";

import { AiCreditsError as AiCreditsErrorClass } from "./types";

export { AiCreditsErrorClass as AiCreditsError };

export function resolveCreditCost(
  kind: AiCreditKind,
  weights: Record<AiCreditKind, number>,
  policyCustom?: Partial<Record<AiCreditKind, number>> | null
): number {
  const fromPolicy = policyCustom?.[kind];
  if (typeof fromPolicy === "number" && fromPolicy >= 0) return Math.max(1, Math.round(fromPolicy));
  const w = weights[kind];
  return Math.max(1, Math.round(w ?? weights.generic ?? 1));
}

export async function getAiCreditsStatus(tenantId: string): Promise<AiCreditsStatusDto> {
  const [featureFlags, weights, policy, usage] = await Promise.all([
    getAiCreditsFeatureFlags(),
    getAiCreditWeights(),
    getTenantAiPolicy(tenantId),
    buildAiCreditsUsage(tenantId)
  ]);
  return { featureFlags, weights, policy, usage };
}

export async function assertAiCreditsAccess(args: {
  tenantId: string;
  clientId?: string | null;
  kind: AiCreditKind;
  /** When false, only checks plan feature flags (legacy path). */
  requireCreativeMemory?: boolean;
}) {
  const ent = await getEntitlements(args.tenantId);
  if (args.requireCreativeMemory !== false && !ent.limits.allowCreativeMemoryAi) {
    throw new PlanLimitError("allowCreativeMemoryAi", "Memória Criativa IA não incluída no plano");
  }

  const v2 = await isAiCreditsV2Enabled();
  if (!v2) {
    const used = await countLegacyAiRequests(args.tenantId);
    const max = ent.limits.maxAiRequestsPerMonth;
    if (max >= 0 && used >= max) {
      throw new PlanLimitError(
        "maxAiRequestsPerMonth",
        `Limit reached: maxAiRequestsPerMonth (${used}/${max})`
      );
    }
    return { creditsCharged: 1, v2: false as const };
  }

  const flags = await getAiCreditsFeatureFlags();
  if (!flags.creditsV2Enabled) {
    throw new AiCreditsErrorClass("AI_CREDITS_FEATURE_OFF", "Camada de créditos IA desativada");
  }

  if (args.clientId && flags.perClientCapsEnabled) {
    const clientSettings = await getClientAiSettings(args.clientId);
    if (!clientSettings.aiEnabled) {
      throw new AiCreditsErrorClass(
        "AI_CREDITS_CLIENT_DISABLED",
        "IA desativada para este cliente"
      );
    }
  }

  const [weights, policy] = await Promise.all([
    getAiCreditWeights(),
    getTenantAiPolicy(args.tenantId)
  ]);
  const creditsCharged = resolveCreditCost(args.kind, weights, policy.customWeights);

  const max = ent.limits.maxAiRequestsPerMonth;
  const used = await sumTenantCreditsUsed(args.tenantId);
  const effectiveMax =
    max < 0
      ? Number.POSITIVE_INFINITY
      : Math.floor(max * (1 - policy.reservePercent / 100));

  if (used + creditsCharged > effectiveMax) {
    throw new AiCreditsErrorClass(
      "AI_CREDITS_TENANT_LIMIT",
      `Créditos IA esgotados (${used}/${max})`
    );
  }

  if (args.clientId && flags.perClientCapsEnabled && policy.distributionMode === "per_client_cap") {
    const clientSettings = await getClientAiSettings(args.clientId);
    const cap =
      clientSettings.aiMonthlyCap ??
      policy.defaultClientMonthlyCap;
    if (cap != null && cap >= 0) {
      const clientUsed = await sumClientCreditsUsed(args.tenantId, args.clientId);
      if (clientUsed + creditsCharged > cap) {
        throw new AiCreditsErrorClass(
          "AI_CREDITS_CLIENT_LIMIT",
          `Limite de créditos IA do cliente atingido (${clientUsed}/${cap})`
        );
      }
    }
  }

  return { creditsCharged, v2: true as const };
}

/** actionType é coluna texto livre (não enum do Postgres) — seguro adicionar valores novos. */
const KIND_TO_ACTION: Record<AiCreditKind, string> = {
  chat: "AB_AI_CHAT",
  chat_with_proposals: "AB_AI_CHAT_AGENT",
  learnings: "CM_AI_LEARNINGS",
  actions: "CM_AI_ACTIONS",
  hypotheses: "AB_AI_HYPOTHESES",
  recommendations: "AI_RECOMMENDATION",
  audience_suggestions: "AUDIENCE_SUGGESTIONS",
  campaign_generate: "CAMPAIGN_AI_GENERATE",
  creator_brain: "CM_AI_ACTIONS",
  generic: "GENERIC_AI",
  campaign_publish: "CAMPAIGN_PUBLISH",
  adset_publish: "ADSET_PUBLISH",
  ad_publish: "AD_PUBLISH",
  persona_save: "PERSONA_SAVE",
  zone_save: "ZONE_SAVE",
  creative_upload: "CREATIVE_UPLOAD",
  persona_generate: "PERSONA_AI_GENERATE",
  zone_generate: "ZONE_AI_GENERATE",
  ad_copy_generate: "AD_COPY_AI_GENERATE",
  creative_variant_generate: "CREATIVE_VARIANT_AI_GENERATE",
  persona_insights: "PERSONA_AI_INSIGHTS",
  geo_insights: "GEO_AI_INSIGHTS",
  report_ai_config: "REPORT_AI_CONFIG",
  commander_verdict: "COMMANDER_VERDICT",
  market_learnings: "AB_AI_MARKET_LEARNINGS"
};

const KIND_TARGET: Record<AiCreditKind, string> = {
  chat: "agency_brain",
  chat_with_proposals: "agency_brain",
  learnings: "creative_memory",
  actions: "creative_memory",
  hypotheses: "agency_brain",
  recommendations: "generic",
  audience_suggestions: "audience_targeting",
  campaign_generate: "campaign_creator",
  creator_brain: "campaign_creator",
  generic: "generic",
  campaign_publish: "meta_campaign",
  adset_publish: "meta_adset",
  ad_publish: "meta_ad",
  persona_save: "persona",
  zone_save: "zone",
  creative_upload: "creative_asset",
  persona_generate: "persona",
  zone_generate: "zone",
  ad_copy_generate: "campaign_creator",
  creative_variant_generate: "campaign_creator",
  persona_insights: "persona",
  geo_insights: "zone",
  report_ai_config: "reports",
  commander_verdict: "commander",
  market_learnings: "agency_brain"
};

const KIND_LABEL = AI_CREDIT_KIND_LABEL;

export async function recordAiCreditUsage(args: {
  tenantId: string;
  clientId: string | null;
  kind: AiCreditKind;
  createdCount: number;
  /** Ausente pra ações manuais (sem chamada de LLM) — publicar campanha, salvar persona, etc. */
  modelMeta?: GeminiGenerateMeta;
  creditsCharged?: number;
  /** O que foi perguntado/pesquisado e a resposta real da IA — pro histórico visível
   * ao usuário em /commander (nunca expõe qual provedor/modelo respondeu). */
  content?: { question?: string; answer?: string };
}) {
  const v2 = await isAiCreditsV2Enabled();
  let credits = args.creditsCharged ?? 1;
  if (v2 && args.creditsCharged == null) {
    const [weights, policy] = await Promise.all([
      getAiCreditWeights(),
      getTenantAiPolicy(args.tenantId)
    ]);
    credits = resolveCreditCost(args.kind, weights, policy.customWeights);
  }

  const { aiRecommendation: recRepo } = await repositories();
  await recRepo.save(
    recRepo.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      targetId: KIND_TARGET[args.kind],
      actionType: KIND_TO_ACTION[args.kind],
      payload: {
        kind: args.kind,
        createdCount: args.createdCount,
        modelRequested: args.modelMeta?.modelRequested ?? null,
        modelUsed: args.modelMeta?.modelUsed ?? null,
        fallbackFrom: args.modelMeta?.fallbackFrom ?? null,
        creditsCharged: credits,
        inputTokens: args.modelMeta?.usage?.inputTokens ?? null,
        outputTokens: args.modelMeta?.usage?.outputTokens ?? null,
        estimatedCostUsd: args.modelMeta?.usage?.costUsd ?? null,
        question: args.content?.question?.slice(0, 500) ?? null,
        answer: args.content?.answer?.slice(0, 1000) ?? null
      },
      // Nunca menciona o provedor/modelo — o usuário não deve saber qual IA respondeu.
      justification: `${KIND_LABEL[args.kind]}: ${args.createdCount} item(ns) (${credits} crédito(s))`,
      status: "APPLIED",
      creditsCharged: credits
    })
  );
}

export function aiCreditsErrorResponse(err: unknown) {
  if (err instanceof AiCreditsErrorClass) {
    return NextResponse.json(
      { ok: false, code: err.code, error: err.message },
      { status: err.code === "AI_CREDITS_CLIENT_DISABLED" ? 403 : 402 }
    );
  }
  return null;
}
