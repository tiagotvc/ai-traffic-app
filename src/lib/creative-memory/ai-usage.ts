import "server-only";

import { repositories } from "@/db/repositories";
import { getEntitlements, PlanLimitError } from "@/lib/billing/entitlements";
import type { GeminiGenerateMeta } from "@/lib/gemini";

const CM_AI_ACTION_TYPES = ["CM_AI_LEARNINGS", "CM_AI_ACTIONS", "AB_AI_HYPOTHESES", "AB_AI_CHAT"] as const;

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
  kind: "learnings" | "actions" | "hypotheses" | "chat";
  createdCount: number;
  modelMeta: GeminiGenerateMeta;
}) {
  const actionTypeMap = {
    learnings: "CM_AI_LEARNINGS",
    actions: "CM_AI_ACTIONS",
    hypotheses: "AB_AI_HYPOTHESES",
    chat: "AB_AI_CHAT"
  } as const;

  const labelMap = {
    learnings: "Memória Criativa (learnings)",
    actions: "Memória Criativa (actions)",
    hypotheses: "Agency Brain (hypotheses)",
    chat: "Agency Brain (chat)"
  } as const;

  const { aiRecommendation: recRepo } = await repositories();
  await recRepo.save(
    recRepo.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      targetId: args.kind === "hypotheses" || args.kind === "chat" ? "agency_brain" : "creative_memory",
      actionType: actionTypeMap[args.kind],
      payload: {
        kind: args.kind,
        createdCount: args.createdCount,
        modelRequested: args.modelMeta.modelRequested,
        modelUsed: args.modelMeta.modelUsed,
        fallbackFrom: args.modelMeta.fallbackFrom ?? null
      },
      justification: `${labelMap[args.kind]}: ${args.createdCount} item(ns) via ${args.modelMeta.modelUsed}`,
      status: "APPLIED"
    })
  );
}

export async function getAgencyBrainAiStatus(tenantId: string) {
  return getCreativeMemoryAiStatus(tenantId);
}
