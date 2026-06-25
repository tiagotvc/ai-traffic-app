import "server-only";

import { repositories } from "@/db/repositories";
import { PlanLimitError } from "@/lib/billing/entitlements";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { GeminiGenerateMeta } from "@/lib/gemini";

import { CM_AI_ACTION_TYPES } from "./defaults";
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

const KIND_TO_ACTION: Record<
  "learnings" | "actions" | "hypotheses" | "chat",
  (typeof CM_AI_ACTION_TYPES)[number]
> = {
  learnings: "CM_AI_LEARNINGS",
  actions: "CM_AI_ACTIONS",
  hypotheses: "AB_AI_HYPOTHESES",
  chat: "AB_AI_CHAT"
};

const KIND_LABEL: Record<"learnings" | "actions" | "hypotheses" | "chat", string> = {
  learnings: "Memória Criativa (learnings)",
  actions: "Memória Criativa (actions)",
  hypotheses: "Agency Brain (hypotheses)",
  chat: "Agency Brain (chat)"
};

export async function recordAiCreditUsage(args: {
  tenantId: string;
  clientId: string;
  kind: "learnings" | "actions" | "hypotheses" | "chat";
  createdCount: number;
  modelMeta: GeminiGenerateMeta;
  creditsCharged?: number;
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
      targetId: args.kind === "hypotheses" || args.kind === "chat" ? "agency_brain" : "creative_memory",
      actionType: KIND_TO_ACTION[args.kind],
      payload: {
        kind: args.kind,
        createdCount: args.createdCount,
        modelRequested: args.modelMeta.modelRequested,
        modelUsed: args.modelMeta.modelUsed,
        fallbackFrom: args.modelMeta.fallbackFrom ?? null,
        creditsCharged: credits
      },
      justification: `${KIND_LABEL[args.kind]}: ${args.createdCount} item(ns) via ${args.modelMeta.modelUsed} (${credits} crédito(s))`,
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
