import "server-only";

import { repositories } from "@/db/repositories";
import { toLearningDto } from "@/lib/agency-brain/client-learning-service";
import type { BrainSummary, LearningDto } from "@/lib/agency-brain/types";

export async function getBrainSummary(
  tenantId: string,
  clientId: string
): Promise<BrainSummary> {
  const { clientLearning: repo } = await repositories();

  const all = await repo.find({
    where: { tenantId, clientId },
    order: { createdAt: "DESC" }
  });

  const active = all.filter((l) => l.status !== "ARCHIVED");
  const byCategory: Record<string, number> = {};
  const tagCounts = new Map<string, number>();

  for (const l of active) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
    for (const tag of l.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const recentApproved = all
    .filter((l) => l.status === "APPROVED")
    .slice(0, 5)
    .map(toLearningDto);

  return {
    total: active.length,
    highImpact: active.filter((l) => l.impact === "HIGH").length,
    creativeCount: active.filter((l) => l.category === "CREATIVE").length,
    audienceCount: active.filter((l) => l.category === "AUDIENCE").length,
    pendingSuggestions: active.filter((l) => l.status === "SUGGESTED").length,
    byCategory,
    topTags,
    recentApproved
  };
}
