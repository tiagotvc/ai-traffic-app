import "server-only";

import { bqInsertRows, isBigQueryEnabled, type BqTableSpec } from "@/lib/analytics/bigquery-client";

/**
 * DAOs do data warehouse do Orion (pedido 2026-07-04). Uma spec por tabela — todas
 * idempotentes (`ensureBqTable` tolera tabelas já criadas no console) e append-only.
 * Escritas são best-effort: warehouse NUNCA derruba o fluxo operacional (Postgres
 * continua a fonte de verdade transacional).
 */

/** orion_raw.meta_campaign_insights — snapshots diários brutos da Meta. */
export const SPEC_META_INSIGHTS: BqTableSpec = {
  dataset: "raw",
  name: "meta_campaign_insights",
  partitionField: "day",
  clustering: ["tenant_id", "meta_campaign_id"],
  schema: [
    { name: "snapshot_id", type: "STRING", mode: "REQUIRED" },
    { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_id", type: "STRING" },
    { name: "ad_account_id", type: "STRING" },
    { name: "meta_ad_account_id", type: "STRING" },
    { name: "meta_campaign_id", type: "STRING", mode: "REQUIRED" },
    { name: "campaign_name", type: "STRING" },
    { name: "campaign_status", type: "STRING" },
    { name: "day", type: "DATE", mode: "REQUIRED" },
    { name: "spend", type: "FLOAT" },
    { name: "impressions", type: "INTEGER" },
    { name: "clicks", type: "INTEGER" },
    { name: "ctr", type: "FLOAT" },
    { name: "cpc", type: "FLOAT" },
    { name: "conversions", type: "INTEGER" },
    { name: "leads", type: "INTEGER" },
    { name: "reach", type: "INTEGER" },
    { name: "messages", type: "INTEGER" },
    { name: "roas", type: "FLOAT" },
    { name: "daily_budget", type: "FLOAT" },
    { name: "updated_at", type: "TIMESTAMP" },
    { name: "exported_at", type: "TIMESTAMP" }
  ]
};

/** orion_research.external_findings — achados de fontes externas com TTL (cache). */
export const SPEC_EXTERNAL_FINDINGS: BqTableSpec = {
  dataset: "research",
  name: "external_findings",
  partitionField: "created_at",
  clustering: ["tenant_id", "source"],
  schema: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_id", type: "STRING" },
    { name: "source", type: "STRING", mode: "REQUIRED" },
    { name: "query", type: "STRING", mode: "REQUIRED" },
    { name: "category", type: "STRING" },
    { name: "title", type: "STRING" },
    { name: "summary", type: "STRING" },
    { name: "confidence", type: "FLOAT" },
    { name: "evidence", type: "STRING" },
    { name: "research_job_id", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "expires_at", type: "TIMESTAMP", mode: "REQUIRED" }
  ]
};

/** orion_cortex.recommendations — toda recomendação gerada pelo Cortex. */
export const SPEC_RECOMMENDATIONS: BqTableSpec = {
  dataset: "cortex",
  name: "recommendations",
  partitionField: "created_at",
  clustering: ["tenant_id", "action_type"],
  schema: [
    { name: "recommendation_id", type: "STRING", mode: "REQUIRED" },
    { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_id", type: "STRING" },
    { name: "title", type: "STRING" },
    { name: "description", type: "STRING" },
    { name: "action_type", type: "STRING" },
    { name: "priority", type: "STRING" },
    { name: "source", type: "STRING" },
    { name: "simulation", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" }
  ]
};

/** orion_cortex.recommendation_events — cada interação com uma recomendação. */
export const SPEC_RECOMMENDATION_EVENTS: BqTableSpec = {
  dataset: "cortex",
  name: "recommendation_events",
  partitionField: "at",
  clustering: ["tenant_id", "event"],
  schema: [
    { name: "event_id", type: "STRING", mode: "REQUIRED" },
    { name: "recommendation_id", type: "STRING", mode: "REQUIRED" },
    { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_id", type: "STRING" },
    { name: "event", type: "STRING", mode: "REQUIRED" },
    { name: "user_id", type: "STRING" },
    { name: "note", type: "STRING" },
    { name: "at", type: "TIMESTAMP", mode: "REQUIRED" }
  ]
};

/** orion_cortex.learnings — aprendizados por cliente (histórico analítico). */
export const SPEC_CORTEX_LEARNINGS: BqTableSpec = {
  dataset: "cortex",
  name: "learnings",
  partitionField: "created_at",
  clustering: ["tenant_id"],
  schema: [
    { name: "learning_id", type: "STRING", mode: "REQUIRED" },
    { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_id", type: "STRING" },
    { name: "title", type: "STRING" },
    { name: "description", type: "STRING" },
    { name: "category", type: "STRING" },
    { name: "impact", type: "STRING" },
    { name: "confidence", type: "STRING" },
    { name: "source", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "tags", type: "STRING" },
    { name: "meta_campaign_id", type: "STRING" },
    { name: "dedupe_key", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "updated_at", type: "TIMESTAMP" },
    { name: "exported_at", type: "TIMESTAMP" }
  ]
};

/** orion_intelligence.global_learnings — agregados anonimizados (opt-in, ≥2 clientes). */
export const SPEC_GLOBAL_LEARNINGS: BqTableSpec = {
  dataset: "intelligence",
  name: "global_learnings",
  partitionField: "aggregated_at",
  clustering: ["niche", "category"],
  schema: [
    { name: "niche", type: "STRING", mode: "REQUIRED" },
    { name: "category", type: "STRING" },
    { name: "title", type: "STRING", mode: "REQUIRED" },
    { name: "occurrences", type: "INTEGER" },
    { name: "clients", type: "INTEGER" },
    { name: "avg_confidence_score", type: "FLOAT" },
    { name: "period_days", type: "INTEGER" },
    { name: "aggregated_at", type: "TIMESTAMP", mode: "REQUIRED" }
  ]
};

/* ------------------------------------------------------------------ writers */

export async function saveRecommendationToWarehouse(input: {
  id: string;
  tenantId: string;
  clientId: string | null;
  title: string;
  description: string;
  actionType: string;
  priority: string;
  source: string;
  simulation?: Record<string, unknown> | null;
  createdAt: Date | string;
}): Promise<void> {
  if (!isBigQueryEnabled()) return;
  try {
    await bqInsertRows(SPEC_RECOMMENDATIONS, [
      {
        recommendation_id: input.id,
        tenant_id: input.tenantId,
        client_id: input.clientId,
        title: input.title,
        description: input.description,
        action_type: input.actionType,
        priority: input.priority,
        source: input.source,
        simulation: input.simulation ? JSON.stringify(input.simulation) : null,
        created_at: new Date(input.createdAt).toISOString()
      }
    ]);
  } catch (err) {
    console.error("[bq-warehouse] saveRecommendation failed", err);
  }
}

export async function saveRecommendationEvent(input: {
  recommendationId: string;
  tenantId: string;
  clientId: string | null;
  event: "created" | "executed" | "acknowledged" | "rejected";
  userId?: string | null;
  note?: string | null;
}): Promise<void> {
  if (!isBigQueryEnabled()) return;
  try {
    await bqInsertRows(SPEC_RECOMMENDATION_EVENTS, [
      {
        event_id: `${input.recommendationId}:${input.event}:${Date.now()}`,
        recommendation_id: input.recommendationId,
        tenant_id: input.tenantId,
        client_id: input.clientId,
        event: input.event,
        user_id: input.userId ?? null,
        note: input.note ?? null,
        at: new Date().toISOString()
      }
    ]);
  } catch (err) {
    console.error("[bq-warehouse] saveRecommendationEvent failed", err);
  }
}

export async function saveGlobalLearnings(
  rows: Array<{
    niche: string;
    category: string | null;
    title: string;
    occurrences: number;
    clients: number;
    avgConfidenceScore: number | null;
    periodDays: number;
  }>
): Promise<number> {
  if (!isBigQueryEnabled() || !rows.length) return 0;
  const aggregatedAt = new Date().toISOString();
  await bqInsertRows(
    SPEC_GLOBAL_LEARNINGS,
    rows.map((r) => ({
      niche: r.niche,
      category: r.category,
      title: r.title,
      occurrences: r.occurrences,
      clients: r.clients,
      avg_confidence_score: r.avgConfidenceScore,
      period_days: r.periodDays,
      aggregated_at: aggregatedAt
    }))
  );
  return rows.length;
}
