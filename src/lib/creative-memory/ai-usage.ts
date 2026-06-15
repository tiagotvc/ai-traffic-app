import "server-only";

import { repositories } from "@/db/repositories";
import { assertLimit } from "@/lib/billing/entitlements";

export async function assertCreativeMemoryAiQuota(tenantId: string) {
  await assertLimit(tenantId, "maxAiRequestsPerMonth");
}

export async function recordCreativeMemoryAiUsage(args: {
  tenantId: string;
  clientId: string;
  kind: "learnings" | "actions";
  createdCount: number;
}) {
  const { aiRecommendation: recRepo } = await repositories();
  await recRepo.save(
    recRepo.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      targetId: "creative_memory",
      actionType: args.kind === "learnings" ? "CM_AI_LEARNINGS" : "CM_AI_ACTIONS",
      payload: { kind: args.kind, createdCount: args.createdCount },
      justification: `Memória Criativa (${args.kind}): ${args.createdCount} item(ns) gerado(s)`,
      status: "APPLIED"
    })
  );
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}
