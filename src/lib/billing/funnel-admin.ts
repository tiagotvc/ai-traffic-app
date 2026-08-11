import "server-only";

import { In } from "typeorm";
import { repositories } from "@/db/repositories";
import type { FunnelEventType } from "@/db/entities/FunnelEvent";

type PeriodFilter = { from?: Date; to?: Date };

export type FunnelRecentRow = {
  visitorId: string;
  email: string | null;
  planSlug: string | null;
  startedAt: string;
  completed: boolean;
};

export type FunnelSummary = {
  viewedPricing: number;
  startedCheckout: number;
  completedCheckout: number;
  abandoned: number;
  conversionRate: number;
  recent: FunnelRecentRow[];
};

/** Visitantes ÚNICOS (não linhas) com esse tipo de evento no período — a métrica que importa. */
async function distinctVisitorCount(eventType: FunnelEventType, filter?: PeriodFilter): Promise<number> {
  const { funnelEvent: repo } = await repositories();
  const qb = repo
    .createQueryBuilder("fe")
    .select("COUNT(DISTINCT fe.visitorId)", "count")
    .where("fe.eventType = :eventType", { eventType });
  if (filter?.from) qb.andWhere("fe.createdAt >= :from", { from: filter.from });
  if (filter?.to) qb.andWhere("fe.createdAt <= :to", { to: filter.to });
  const row = await qb.getRawOne<{ count: string }>();
  return Number(row?.count ?? 0);
}

/**
 * Resumo do funil pra o painel admin. "Desistiu" não é gravado — é calculado
 * (iniciou − completou, no mesmo período), igual descrito no plano.
 */
export async function getFunnelSummary(filter?: PeriodFilter): Promise<FunnelSummary> {
  const { funnelEvent: repo } = await repositories();

  const [viewedPricing, startedCheckout, completedCheckout] = await Promise.all([
    distinctVisitorCount("viewed_pricing", filter),
    distinctVisitorCount("started_checkout", filter),
    distinctVisitorCount("completed_checkout", filter)
  ]);

  const abandoned = Math.max(0, startedCheckout - completedCheckout);
  const conversionRate = startedCheckout > 0 ? Math.round((completedCheckout / startedCheckout) * 100) : 0;

  const startedQb = repo
    .createQueryBuilder("fe")
    .where("fe.eventType = :eventType", { eventType: "started_checkout" })
    .orderBy("fe.createdAt", "DESC")
    .take(50);
  if (filter?.from) startedQb.andWhere("fe.createdAt >= :from", { from: filter.from });
  if (filter?.to) startedQb.andWhere("fe.createdAt <= :to", { to: filter.to });
  const startedRows = await startedQb.getMany();

  const visitorIds = [...new Set(startedRows.map((r) => r.visitorId))];
  const completedRows = visitorIds.length
    ? await repo.find({ where: { visitorId: In(visitorIds), eventType: "completed_checkout" } })
    : [];
  const completedVisitorSet = new Set(completedRows.map((r) => r.visitorId));

  const recent: FunnelRecentRow[] = startedRows.map((r) => ({
    visitorId: r.visitorId,
    email: r.email ?? null,
    planSlug: r.planSlug ?? null,
    startedAt: r.createdAt.toISOString(),
    completed: completedVisitorSet.has(r.visitorId)
  }));

  return { viewedPricing, startedCheckout, completedCheckout, abandoned, conversionRate, recent };
}
