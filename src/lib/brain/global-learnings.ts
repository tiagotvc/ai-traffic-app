import "server-only";

import { repositories } from "@/db/repositories";
import { isBigQueryEnabled } from "@/lib/analytics/bigquery-client";
import { saveGlobalLearnings } from "@/lib/analytics/bq-warehouse";

/**
 * orion_intelligence.global_learnings: aprendizados APROVADOS agregados por nicho —
 * anonimizados por construção (sem tenant/client id; só entra com opt-in do tenant e
 * com ≥2 clientes distintos confirmando o mesmo aprendizado). É a semente do
 * "Orion Memory": o que funciona no nicho, provado por contas reais.
 */

const PERIOD_DAYS = 90;
const MIN_DISTINCT_CLIENTS = 2;

type AggRow = {
  niche: string;
  category: string | null;
  title: string;
  occurrences: string;
  clients: string;
  avg_score: string | null;
};

export async function aggregateGlobalLearnings(): Promise<{ rows: number }> {
  if (!isBigQueryEnabled()) return { rows: 0 };

  const { clientLearning: repo } = await repositories();
  const rows = (await repo.query(
    `SELECT c."niche" AS niche, l."category" AS category, l."title" AS title,
            COUNT(*) AS occurrences,
            COUNT(DISTINCT l."clientId") AS clients,
            AVG(l."confidenceScore") AS avg_score
     FROM "client_learnings" l
     JOIN "clients" c ON c."id" = l."clientId"
     JOIN "tenants" t ON t."id" = l."tenantId"
     WHERE l."status" = 'APPROVED'
       AND t."agencyBrainNicheShareOptIn" = true
       AND c."niche" IS NOT NULL
       AND l."createdAt" >= now() - interval '${PERIOD_DAYS} days'
     GROUP BY c."niche", l."category", l."title"
     HAVING COUNT(DISTINCT l."clientId") >= ${MIN_DISTINCT_CLIENTS}
     ORDER BY occurrences DESC
     LIMIT 200`
  )) as AggRow[];

  if (!rows.length) return { rows: 0 };

  const saved = await saveGlobalLearnings(
    rows.map((r) => ({
      niche: r.niche,
      category: r.category,
      title: r.title,
      occurrences: Number(r.occurrences) || 0,
      clients: Number(r.clients) || 0,
      avgConfidenceScore: r.avg_score != null ? Math.round(Number(r.avg_score) * 100) / 100 : null,
      periodDays: PERIOD_DAYS
    }))
  );
  return { rows: saved };
}
