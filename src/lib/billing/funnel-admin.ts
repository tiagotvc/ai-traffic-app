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

/** Funil de aquisição: do clique no anúncio até o trial ativo. */
export type FunnelAcquisition = {
  viewedLanding: number;
  clickedCta: number;
  startedSignup: number;
  completedSignup: number;
  startedTrial: number;
};

/**
 * A mesma contagem quebrada por origem. É o que responde "qual anúncio trouxe trial" sem
 * depender do relatório da Meta, que só enxerga quem aceitou cookies.
 *
 * `startedTrial` fica de fora: a linha do trial nasce num webhook, sem a URL da campanha
 * por perto. Quando precisar, a origem do trial sai de `users.signupAttribution`.
 */
export type FunnelSourceRow = {
  source: string;
  campaign: string;
  content: string;
  viewedLanding: number;
  clickedCta: number;
  startedSignup: number;
  completedSignup: number;
};

export type FunnelSummary = {
  viewedPricing: number;
  startedCheckout: number;
  completedCheckout: number;
  abandoned: number;
  conversionRate: number;
  recent: FunnelRecentRow[];
  acquisition: FunnelAcquisition;
  bySource: FunnelSourceRow[];
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

/** Etapas que carregam a origem da campanha, na ordem do funil. */
const ATTRIBUTED_STEPS = [
  "viewed_landing",
  "clicked_cta",
  "started_signup",
  "completed_signup"
] as const satisfies readonly FunnelEventType[];

const STEP_FIELD: Record<(typeof ATTRIBUTED_STEPS)[number], keyof Omit<FunnelSourceRow, "source" | "campaign" | "content">> = {
  viewed_landing: "viewedLanding",
  clicked_cta: "clickedCta",
  started_signup: "startedSignup",
  completed_signup: "completedSignup"
};

/** Teto de linhas lidas pro recorte por origem. Alto o bastante pro volume atual. */
const SOURCE_ROW_LIMIT = 5000;

/**
 * Quebra o funil por utm_source/campaign/content. Agrega em memória de propósito: o
 * recorte é jsonb e o volume ainda é de centenas por dia, então não vale o risco de
 * uma expressão jsonb crua no query builder. Se um dia passar de {@link SOURCE_ROW_LIMIT},
 * vira `GROUP BY` no banco.
 */
async function sourceBreakdown(filter?: PeriodFilter): Promise<FunnelSourceRow[]> {
  const { funnelEvent: repo } = await repositories();

  const qb = repo
    .createQueryBuilder("fe")
    .where("fe.eventType IN (:...types)", { types: [...ATTRIBUTED_STEPS] })
    .orderBy("fe.createdAt", "DESC")
    .take(SOURCE_ROW_LIMIT);
  if (filter?.from) qb.andWhere("fe.createdAt >= :from", { from: filter.from });
  if (filter?.to) qb.andWhere("fe.createdAt <= :to", { to: filter.to });

  const rows = await qb.getMany();

  // Visitante único por (origem, etapa): quem recarrega a landing três vezes conta uma.
  const seen = new Set<string>();
  const byKey = new Map<string, FunnelSourceRow>();

  for (const row of rows) {
    const attribution = (row.meta?.attribution ?? {}) as Record<string, string | undefined>;
    const source = attribution.utm_source ?? (attribution.fbclid ? "meta" : "direto");
    const campaign = attribution.utm_campaign ?? "-";
    const content = attribution.utm_content ?? "-";
    const key = `${source}|${campaign}|${content}`;

    const dedupKey = `${key}|${row.eventType}|${row.visitorId}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        source,
        campaign,
        content,
        viewedLanding: 0,
        clickedCta: 0,
        startedSignup: 0,
        completedSignup: 0
      };
      byKey.set(key, entry);
    }

    const field = STEP_FIELD[row.eventType as (typeof ATTRIBUTED_STEPS)[number]];
    if (field) entry[field] += 1;
  }

  return [...byKey.values()].sort((a, b) => b.viewedLanding - a.viewedLanding);
}

/**
 * Resumo do funil pra o painel admin. "Desistiu" não é gravado — é calculado
 * (iniciou − completou, no mesmo período), igual descrito no plano.
 */
export async function getFunnelSummary(filter?: PeriodFilter): Promise<FunnelSummary> {
  const { funnelEvent: repo } = await repositories();

  const [
    viewedPricing,
    startedCheckout,
    completedCheckout,
    viewedLanding,
    clickedCta,
    startedSignup,
    completedSignup,
    startedTrial,
    bySource
  ] = await Promise.all([
    distinctVisitorCount("viewed_pricing", filter),
    distinctVisitorCount("started_checkout", filter),
    distinctVisitorCount("completed_checkout", filter),
    distinctVisitorCount("viewed_landing", filter),
    distinctVisitorCount("clicked_cta", filter),
    distinctVisitorCount("started_signup", filter),
    distinctVisitorCount("completed_signup", filter),
    distinctVisitorCount("started_trial", filter),
    sourceBreakdown(filter)
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

  return {
    viewedPricing,
    startedCheckout,
    completedCheckout,
    abandoned,
    conversionRate,
    recent,
    acquisition: { viewedLanding, clickedCta, startedSignup, completedSignup, startedTrial },
    bySource
  };
}
