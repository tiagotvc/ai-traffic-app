import "server-only";

import { repositories } from "@/db/repositories";
import { toLearningDto } from "@/lib/agency-brain/client-learning-service";
import type { BrainSummary } from "@/lib/agency-brain/types";

export async function countAgencyHypotheses(tenantId: string): Promise<number> {
  const { clientHypothesis: repo } = await repositories();
  return repo
    .createQueryBuilder("h")
    .where('h."tenantId" = :tenantId', { tenantId })
    .andWhere("h.status NOT IN (:...excluded)", { excluded: ["REJECTED", "ARCHIVED"] })
    .getCount();
}

export async function countAgencyLearningsShelf(tenantId: string): Promise<number> {
  const { clientLearning: repo } = await repositories();
  return repo
    .createQueryBuilder("l")
    .where('l."tenantId" = :tenantId', { tenantId })
    .andWhere("l.status IN (:...statuses)", { statuses: ["SUGGESTED", "APPROVED"] })
    .getCount();
}

export async function getBrainSummary(tenantId: string, clientId: string): Promise<BrainSummary> {
  const { clientLearning: repo } = await repositories();
  const rows = await repo.find({
    where: { tenantId, clientId },
    order: { updatedAt: "DESC" },
    take: 200
  });

  const items = rows.map(toLearningDto);
  const approved = items.filter((l) => l.status === "APPROVED");
  const byCategory: Record<string, number> = {};
  const tagCounts = new Map<string, number>();

  for (const l of approved) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
    for (const tag of l.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  return {
    total: approved.length,
    highImpact: approved.filter((l) => l.impact === "HIGH").length,
    creativeCount: approved.filter((l) => l.category === "CREATIVE").length,
    audienceCount: approved.filter((l) => l.category === "AUDIENCE").length,
    pendingSuggestions: items.filter((l) => l.status === "SUGGESTED").length,
    byCategory,
    topTags,
    recentApproved: approved.slice(0, 5)
  };
}
