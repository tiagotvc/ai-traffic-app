import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { BQ_DATASET, getBigQuery, isBigQueryEnabled } from "@/lib/analytics/bigquery-client";

/**
 * Brain › Benchmarking (Fase 5, docs/orion-architecture §5): agregados por nicho
 * calculados sobre o histórico do BigQuery e MATERIALIZADOS no Postgres
 * (`platform_settings.brain_niche_benchmarks`). A fronteira do plano analítico é
 * respeitada: o BQ é lido apenas neste job (chamado pelo cron `bq-export`); os caminhos
 * de request leem o snapshot materializado via `getNicheBenchmarks()`.
 *
 * Privacidade: só entram clientes de tenants com `agencyBrainNicheShareOptIn = true`,
 * e um nicho só publica benchmark com 2+ clientes (nunca expõe conta individual).
 */

const STATE_KEY = "brain_niche_benchmarks";
const WINDOW_DAYS = 90;
const MIN_CLIENTS_PER_NICHE = 2;

export type NicheBenchmark = {
  clients: number;
  totalSpend: number;
  avgCpa: number | null;
  avgCtr: number | null;
  avgRoas: number | null;
};

export type NicheBenchmarksSnapshot = {
  refreshedAt: string;
  windowDays: number;
  niches: Record<string, NicheBenchmark>;
};

type ClientAggRow = {
  client_id: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  avg_roas: number | null;
};

export async function refreshNicheBenchmarks(): Promise<{
  enabled: boolean;
  niches: number;
}> {
  if (!isBigQueryEnabled()) return { enabled: false, niches: 0 };
  const bq = await getBigQuery();
  if (!bq) return { enabled: false, niches: 0 };

  // Dedup por chave natural: o export é append-only, a última versão de cada snapshot vence.
  const query = `
    WITH latest AS (
      SELECT * EXCEPT (rn) FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY updated_at DESC) AS rn
        FROM \`${BQ_DATASET}.campaign_snapshots\`
        WHERE day >= DATE_SUB(CURRENT_DATE(), INTERVAL ${WINDOW_DAYS} DAY)
      )
      WHERE rn = 1
    )
    SELECT
      client_id,
      SUM(spend) AS spend,
      SUM(conversions) AS conversions,
      SUM(clicks) AS clicks,
      SUM(impressions) AS impressions,
      AVG(NULLIF(roas, 0)) AS avg_roas
    FROM latest
    WHERE client_id IS NOT NULL
    GROUP BY client_id
  `;
  const [rows] = (await bq.query({ query })) as unknown as [ClientAggRow[]];
  if (!rows.length) return { enabled: true, niches: 0 };

  // Mapeia cliente → nicho, só para tenants com opt-in de compartilhamento.
  const repos = await repositories();
  const clients = await repos.client.find({
    where: { id: In(rows.map((r) => r.client_id)) }
  });
  const tenants = await repos.tenant.find({
    where: { id: In([...new Set(clients.map((c) => c.tenantId))]) }
  });
  const optedIn = new Set(tenants.filter((t) => t.agencyBrainNicheShareOptIn).map((t) => t.id));
  const nicheByClient = new Map(
    clients
      .filter((c) => c.niche && optedIn.has(c.tenantId))
      .map((c) => [c.id, String(c.niche)])
  );

  type Agg = { clients: number; spend: number; conversions: number; clicks: number; impressions: number; roasSum: number; roasN: number };
  const byNiche = new Map<string, Agg>();
  for (const row of rows) {
    const niche = nicheByClient.get(row.client_id);
    if (!niche) continue;
    const agg = byNiche.get(niche) ?? {
      clients: 0, spend: 0, conversions: 0, clicks: 0, impressions: 0, roasSum: 0, roasN: 0
    };
    agg.clients += 1;
    agg.spend += Number(row.spend ?? 0);
    agg.conversions += Number(row.conversions ?? 0);
    agg.clicks += Number(row.clicks ?? 0);
    agg.impressions += Number(row.impressions ?? 0);
    if (row.avg_roas != null) {
      agg.roasSum += Number(row.avg_roas);
      agg.roasN += 1;
    }
    byNiche.set(niche, agg);
  }

  const niches: Record<string, NicheBenchmark> = {};
  for (const [niche, agg] of byNiche) {
    if (agg.clients < MIN_CLIENTS_PER_NICHE) continue;
    niches[niche] = {
      clients: agg.clients,
      totalSpend: Math.round(agg.spend * 100) / 100,
      avgCpa: agg.conversions > 0 ? Math.round((agg.spend / agg.conversions) * 100) / 100 : null,
      avgCtr:
        agg.impressions > 0 ? Math.round((agg.clicks / agg.impressions) * 10000) / 100 : null,
      avgRoas: agg.roasN > 0 ? Math.round((agg.roasSum / agg.roasN) * 100) / 100 : null
    };
  }

  const snapshot: NicheBenchmarksSnapshot = {
    refreshedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    niches
  };
  await repos.platformSetting.save({ key: STATE_KEY, value: snapshot });

  return { enabled: true, niches: Object.keys(niches).length };
}

/** Leitura do snapshot materializado — usada por caminhos de request (nunca lê BQ). */
export async function getNicheBenchmarks(): Promise<NicheBenchmarksSnapshot | null> {
  const { platformSetting: repo } = await repositories();
  const row = await repo.findOne({ where: { key: STATE_KEY } });
  return (row?.value as NicheBenchmarksSnapshot) ?? null;
}
