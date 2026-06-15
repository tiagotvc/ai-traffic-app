import "server-only";

import { repositories } from "@/db/repositories";
import { getEntitlements, PlanLimitError } from "@/lib/billing/entitlements";
import type { GeminiGenerateMeta } from "@/lib/gemini";

const CM_AI_ACTION_TYPES = ["CM_AI_LEARNINGS", "CM_AI_ACTIONS"] as const;

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export async function getCreativeMemoryAiUsageCount(tenantId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { aiRecommendation: recRepo } = await repositories();
  return recRepo
    .createQueryBuilder("r")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart })
    .andWhere("r.actionType IN (:...types)", { types: [...CM_AI_ACTION_TYPES] })
    .getCount();
}

export async function assertCreativeMemoryAiAccess(tenantId: string) {
  const ent = await getEntitlements(tenantId);
  if (!ent.limits.allowCreativeMemoryAi) {
    throw new PlanLimitError("allowCreativeMemoryAi", "Memória Criativa IA não incluída no plano");
  }

  const used = await getCreativeMemoryAiUsageCount(tenantId);
  const max = ent.limits.maxAiRequestsPerMonth;
  if (used >= max) {
    throw new PlanLimitError(
      "maxAiRequestsPerMonth",
      `Limit reached: maxAiRequestsPerMonth (${used}/${max})`
    );
  }
}

export async function getCreativeMemoryAiStatus(tenantId: string) {
  const ent = await getEntitlements(tenantId);
  const used = await getCreativeMemoryAiUsageCount(tenantId);
  const max = ent.limits.maxAiRequestsPerMonth;

  return {
    geminiConfigured: Boolean(getGeminiApiKey()),
    featureAllowed: ent.limits.allowCreativeMemoryAi,
    usage: {
      aiRequestsThisMonth: used,
      maxAiRequestsPerMonth: max,
      remaining: Math.max(0, max - used)
    },
    planSlug: ent.planSlug
  };
}

export async function recordCreativeMemoryAiUsage(args: {
  tenantId: string;
  clientId: string;
  kind: "learnings" | "actions";
  createdCount: number;
  modelMeta: GeminiGenerateMeta;
}) {
  const { aiRecommendation: recRepo } = await repositories();
  await recRepo.save(
    recRepo.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      targetId: "creative_memory",
      actionType: args.kind === "learnings" ? "CM_AI_LEARNINGS" : "CM_AI_ACTIONS",
      payload: {
        kind: args.kind,
        createdCount: args.createdCount,
        modelRequested: args.modelMeta.modelRequested,
        modelUsed: args.modelMeta.modelUsed,
        fallbackFrom: args.modelMeta.fallbackFrom ?? null
      },
      justification: `Memória Criativa (${args.kind}): ${args.createdCount} item(ns) via ${args.modelMeta.modelUsed}`,
      status: "APPLIED"
    })
  );
}
