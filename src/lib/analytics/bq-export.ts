import "server-only";

import { IsNull, MoreThan, In } from "typeorm";
import type { Table } from "@google-cloud/bigquery";

import { repositories } from "@/db/repositories";
import { BQ_DATASET, BQ_LOCATION, getBigQuery, isBigQueryEnabled } from "@/lib/analytics/bigquery-client";

/**
 * Export incremental Postgres → BigQuery (Fase 2 da arquitetura, docs/orion-architecture §5).
 *
 * Contrato:
 * - Append-only: linhas atualizadas no Postgres são re-exportadas como novas versões;
 *   consumidores deduplicam pela chave natural + `updated_at` máximo (view analítica).
 * - Watermark por tabela em `platform_settings` (key `bq_export_state`), avançado só
 *   após insert bem-sucedido — falha nunca perde delta, no máximo re-exporta.
 * - `domain_events` usa o próprio outbox como cursor (`processedAt IS NULL`).
 * - Tabelas particionadas por dia e clusterizadas por `tenant_id` — é o que mantém
 *   milhares de clientes baratos de consultar.
 */

const STATE_KEY = "bq_export_state";
const BATCH = 2000;
const INSERT_CHUNK = 500;

type ExportState = {
  campaign_snapshots?: string;
  learnings?: string;
  executions?: string;
};

type TableSpec = {
  name: string;
  partitionField: string;
  clustering: string[];
  schema: Array<{ name: string; type: string; mode?: string }>;
};

const TABLES: TableSpec[] = [
  {
    name: "campaign_snapshots",
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
  },
  {
    name: "domain_events",
    partitionField: "occurred_at",
    clustering: ["tenant_id", "module"],
    schema: [
      { name: "event_id", type: "STRING", mode: "REQUIRED" },
      { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
      { name: "client_id", type: "STRING" },
      { name: "module", type: "STRING" },
      { name: "type", type: "STRING" },
      { name: "payload", type: "STRING" },
      { name: "source_type", type: "STRING" },
      { name: "source_id", type: "STRING" },
      { name: "occurred_at", type: "TIMESTAMP", mode: "REQUIRED" },
      { name: "exported_at", type: "TIMESTAMP" }
    ]
  },
  {
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
  },
  {
    name: "executions",
    partitionField: "created_at",
    clustering: ["tenant_id", "source"],
    schema: [
      { name: "execution_id", type: "STRING", mode: "REQUIRED" },
      { name: "tenant_id", type: "STRING", mode: "REQUIRED" },
      { name: "client_id", type: "STRING" },
      { name: "source", type: "STRING" },
      { name: "source_id", type: "STRING" },
      { name: "automation_rule_id", type: "STRING" },
      { name: "meta_campaign_id", type: "STRING" },
      { name: "action_type", type: "STRING" },
      { name: "status", type: "STRING" },
      { name: "description", type: "STRING" },
      { name: "payload", type: "STRING" },
      { name: "result", type: "STRING" },
      { name: "error", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
      { name: "executed_at", type: "TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP" },
      { name: "exported_at", type: "TIMESTAMP" }
    ]
  }
];

/** Cria dataset + tabelas se não existirem (idempotente; roda a cada export). */
async function ensureBigQuerySchema(): Promise<Record<string, Table>> {
  const bq = await getBigQuery();
  if (!bq) throw new Error("BigQuery desabilitado");

  const dataset = bq.dataset(BQ_DATASET);
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    await bq.createDataset(BQ_DATASET, { location: BQ_LOCATION });
  }

  const tables: Record<string, Table> = {};
  for (const spec of TABLES) {
    const table = dataset.table(spec.name);
    const [tableExists] = await table.exists();
    if (!tableExists) {
      await dataset.createTable(spec.name, {
        schema: spec.schema,
        timePartitioning: { type: "DAY", field: spec.partitionField },
        clustering: { fields: spec.clustering }
      });
    }
    tables[spec.name] = table;
  }
  return tables;
}

async function insertRows(table: Table, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await table.insert(rows.slice(i, i + INSERT_CHUNK));
  }
}

async function loadState(): Promise<ExportState> {
  const { platformSetting: repo } = await repositories();
  const row = await repo.findOne({ where: { key: STATE_KEY } });
  return (row?.value as ExportState) ?? {};
}

async function saveState(state: ExportState): Promise<void> {
  const { platformSetting: repo } = await repositories();
  await repo.save({ key: STATE_KEY, value: state });
}

const EPOCH = "1970-01-01T00:00:00.000Z";
const nowIso = () => new Date().toISOString();

async function exportCampaignSnapshots(table: Table, state: ExportState): Promise<number> {
  const { campaignMetricSnapshot: repo } = await repositories();
  const watermark = state.campaign_snapshots ?? EPOCH;

  // tenant_id não existe na tabela de snapshots (escopo via FK) — resolve pelo join.
  const rows = (await repo.query(
    `SELECT s."id", s."updatedAt", s."adAccountId", s."metaCampaignId", s."campaignName",
            s."campaignStatus", s."day", s."spend", s."impressions", s."clicks", s."ctr",
            s."cpc", s."conversions", s."leads", s."reach", s."messages", s."roas",
            s."dailyBudget", a."metaAdAccountId", a."clientId", c."tenantId"
     FROM "campaign_metric_snapshots" s
     JOIN "ad_accounts" a ON a."id" = s."adAccountId"
     JOIN "clients" c ON c."id" = a."clientId"
     WHERE s."updatedAt" > $1
     ORDER BY s."updatedAt" ASC
     LIMIT ${BATCH}`,
    [watermark]
  )) as Array<Record<string, unknown>>;
  if (!rows.length) return 0;

  const exportedAt = nowIso();
  await insertRows(
    table,
    rows.map((r) => ({
      snapshot_id: r.id,
      tenant_id: r.tenantId,
      client_id: r.clientId ?? null,
      ad_account_id: r.adAccountId,
      meta_ad_account_id: r.metaAdAccountId ?? null,
      meta_campaign_id: r.metaCampaignId,
      campaign_name: r.campaignName ?? null,
      campaign_status: r.campaignStatus ?? null,
      day: String(r.day).slice(0, 10),
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      ctr: Number(r.ctr ?? 0),
      cpc: Number(r.cpc ?? 0),
      conversions: Number(r.conversions ?? 0),
      leads: Number(r.leads ?? 0),
      reach: Number(r.reach ?? 0),
      messages: Number(r.messages ?? 0),
      roas: Number(r.roas ?? 0),
      daily_budget: r.dailyBudget == null ? null : Number(r.dailyBudget),
      updated_at: new Date(r.updatedAt as string).toISOString(),
      exported_at: exportedAt
    }))
  );

  state.campaign_snapshots = new Date(
    rows[rows.length - 1].updatedAt as string
  ).toISOString();
  return rows.length;
}

async function exportLearnings(table: Table, state: ExportState): Promise<number> {
  const { clientLearning: repo } = await repositories();
  const watermark = state.learnings ?? EPOCH;
  const rows = await repo.find({
    where: { updatedAt: MoreThan(new Date(watermark)) },
    order: { updatedAt: "ASC" },
    take: BATCH
  });
  if (!rows.length) return 0;

  const exportedAt = nowIso();
  await insertRows(
    table,
    rows.map((r) => ({
      learning_id: r.id,
      tenant_id: r.tenantId,
      client_id: r.clientId,
      title: r.title,
      description: r.description,
      category: r.category,
      impact: r.impact,
      confidence: r.confidence,
      source: r.source,
      status: r.status,
      tags: JSON.stringify(r.tags ?? []),
      meta_campaign_id: r.metaCampaignId ?? null,
      dedupe_key: r.dedupeKey ?? null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      exported_at: exportedAt
    }))
  );

  state.learnings = rows[rows.length - 1].updatedAt.toISOString();
  return rows.length;
}

async function exportExecutions(table: Table, state: ExportState): Promise<number> {
  const { engineExecution: repo } = await repositories();
  const watermark = state.executions ?? EPOCH;
  const rows = await repo.find({
    where: { updatedAt: MoreThan(new Date(watermark)) },
    order: { updatedAt: "ASC" },
    take: BATCH
  });
  if (!rows.length) return 0;

  const exportedAt = nowIso();
  await insertRows(
    table,
    rows.map((r) => ({
      execution_id: r.id,
      tenant_id: r.tenantId,
      client_id: r.clientId ?? null,
      source: r.source,
      source_id: r.sourceId ?? null,
      automation_rule_id: r.automationRuleId ?? null,
      meta_campaign_id: r.metaCampaignId ?? null,
      action_type: r.actionType,
      status: r.status,
      description: r.description,
      payload: r.payload ? JSON.stringify(r.payload) : null,
      result: r.result ? JSON.stringify(r.result) : null,
      error: r.error ?? null,
      created_at: r.createdAt.toISOString(),
      executed_at: r.executedAt?.toISOString() ?? null,
      updated_at: r.updatedAt.toISOString(),
      exported_at: exportedAt
    }))
  );

  state.executions = rows[rows.length - 1].updatedAt.toISOString();
  return rows.length;
}

async function exportDomainEvents(table: Table): Promise<number> {
  const { domainEvent: repo } = await repositories();
  const rows = await repo.find({
    where: { processedAt: IsNull() },
    order: { createdAt: "ASC" },
    take: BATCH
  });
  if (!rows.length) return 0;

  const exportedAt = nowIso();
  await insertRows(
    table,
    rows.map((r) => ({
      event_id: r.id,
      tenant_id: r.tenantId,
      client_id: r.clientId ?? null,
      module: r.module,
      type: r.type,
      payload: r.payload ? JSON.stringify(r.payload) : null,
      source_type: r.sourceType ?? null,
      source_id: r.sourceId ?? null,
      occurred_at: r.createdAt.toISOString(),
      exported_at: exportedAt
    }))
  );

  // O outbox é o próprio cursor: marca como processado só após o insert dar certo.
  await repo.update({ id: In(rows.map((r) => r.id)) }, { processedAt: new Date() });
  return rows.length;
}

export type BigQueryExportSummary = {
  enabled: boolean;
  exported: Record<string, number>;
  errors: Record<string, string>;
};

/**
 * Roda um ciclo de export incremental (chamado pelo cron `/api/cron/bq-export`).
 * Cada tabela é independente: falha em uma não bloqueia as outras nem avança o
 * watermark dela — o próximo ciclo retenta do mesmo ponto.
 */
export async function runBigQueryExport(): Promise<BigQueryExportSummary> {
  if (!isBigQueryEnabled()) {
    return { enabled: false, exported: {}, errors: {} };
  }

  const tables = await ensureBigQuerySchema();
  const state = await loadState();
  const exported: Record<string, number> = {};
  const errors: Record<string, string> = {};

  const jobs: Array<[string, () => Promise<number>]> = [
    ["campaign_snapshots", () => exportCampaignSnapshots(tables.campaign_snapshots, state)],
    ["learnings", () => exportLearnings(tables.learnings, state)],
    ["executions", () => exportExecutions(tables.executions, state)],
    ["domain_events", () => exportDomainEvents(tables.domain_events)]
  ];

  for (const [name, job] of jobs) {
    try {
      exported[name] = await job();
    } catch (err) {
      errors[name] = err instanceof Error ? err.message : "erro desconhecido";
      console.error(`[bq-export] ${name} failed`, err);
    }
  }

  await saveState(state);
  return { enabled: true, exported, errors };
}
