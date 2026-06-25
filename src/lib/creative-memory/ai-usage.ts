import "server-only";

import { getEntitlements } from "@/lib/billing/entitlements";
import type { GeminiGenerateMeta } from "@/lib/gemini";
import {
  getAiCreditsStatus,
  recordAiCreditUsage,
  resolveCreditCost
} from "@/lib/ai-credits/credits-service";
import { AiCreditsError, aiCreditsErrorResponse } from "@/lib/ai-credits/credits-service";
import { countLegacyAiRequests } from "@/lib/ai-credits/usage-service";
import { isAiCreditsV2Enabled } from "@/lib/ai-credits/feature-flags";
import { getTenantAiPolicy } from "@/lib/ai-credits/policy-service";
import { getAiCreditWeights } from "@/lib/ai-credits/feature-flags";

export { AiCreditsError, aiCreditsErrorResponse };

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export async function assertCreativeMemoryAiAccess(
  tenantId: string,
  clientId?: string | null,
  kind: "learnings" | "actions" | "hypotheses" | "chat" | "chat_with_proposals" | "generic" = "generic"
) {
  const { assertAiCreditsAccess } = await import("@/lib/ai-credits/credits-service");
  await assertAiCreditsAccess({
    tenantId,
    clientId,
    kind,
    requireCreativeMemory: true
  });
}

export async function getCreativeMemoryAiStatus(tenantId: string) {
  const ent = await getEntitlements(tenantId);
  const v2 = await isAiCreditsV2Enabled();

  if (v2) {
    const status = await getAiCreditsStatus(tenantId);
    return {
      geminiConfigured: Boolean(getGeminiApiKey()),
      featureAllowed: ent.limits.allowCreativeMemoryAi,
      creditsV2: true as const,
      usage: {
        aiRequestsThisMonth: status.usage.creditsUsed,
        maxAiRequestsPerMonth: status.usage.creditsLimit,
        remaining:
          status.usage.creditsLimit < 0
            ? Number.POSITIVE_INFINITY
            : status.usage.creditsRemaining,
        nearLimit: status.usage.nearLimit,
        atLimit: status.usage.atLimit
      },
      policy: status.policy,
      featureFlags: status.featureFlags,
      planSlug: ent.planSlug
    };
  }

  const used = await countLegacyAiRequests(tenantId);
  const max = ent.limits.maxAiRequestsPerMonth;

  return {
    geminiConfigured: Boolean(getGeminiApiKey()),
    featureAllowed: ent.limits.allowCreativeMemoryAi,
    creditsV2: false as const,
    usage: {
      aiRequestsThisMonth: used,
      maxAiRequestsPerMonth: max,
      remaining: Math.max(0, max - used)
    },
    planSlug: ent.planSlug
  };
}

export async function getAgencyBrainAiStatus(tenantId: string) {
  return getCreativeMemoryAiStatus(tenantId);
}

export async function recordCreativeMemoryAiUsage(args: {
  tenantId: string;
  clientId: string;
  kind: "learnings" | "actions" | "hypotheses" | "chat";
  createdCount: number;
  modelMeta: GeminiGenerateMeta;
  /** Override credit weight (e.g. chat_with_proposals). */
  creditKind?: "learnings" | "actions" | "hypotheses" | "chat" | "chat_with_proposals";
}) {
  const v2 = await isAiCreditsV2Enabled();
  let creditsCharged = 1;
  if (v2) {
    const [weights, policy] = await Promise.all([
      getAiCreditWeights(),
      getTenantAiPolicy(args.tenantId)
    ]);
    creditsCharged = resolveCreditCost(
      (args.creditKind ?? args.kind) as import("@/lib/ai-credits/types").AiCreditKind,
      weights,
      policy.customWeights
    );
  }

  await recordAiCreditUsage({
    ...args,
    creditsCharged
  });
}

/** @deprecated use count via getCreativeMemoryAiStatus */
export async function getCreativeMemoryAiUsageCount(tenantId: string): Promise<number> {
  const status = await getCreativeMemoryAiStatus(tenantId);
  return status.usage.aiRequestsThisMonth;
}
