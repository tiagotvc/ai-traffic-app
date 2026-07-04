import "server-only";

import type { BigQuery } from "@google-cloud/bigquery";

/**
 * Cliente BigQuery do plano analítico (docs/orion-architecture §5).
 *
 * Fronteira inegociável: BigQuery NUNCA é lido em caminho síncrono de request e NUNCA é
 * fonte de verdade operacional — só recebe o export append-only e serve consultas
 * analíticas (benchmarking, memória longa) em jobs/rotas assíncronas.
 *
 * Config por env:
 * - `ENABLE_BIGQUERY_ANALYTICS=true` liga o plano (desligado = tudo vira no-op).
 * - `BIGQUERY_CREDENTIALS_JSON` = JSON inline da service account (Vercel-friendly),
 *   ou Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`).
 * - `BIGQUERY_PROJECT_ID` (opcional se vier no JSON), `BIGQUERY_DATASET`
 *   (default `orion_analytics`), `BIGQUERY_LOCATION` (default `southamerica-east1`).
 */

export const BQ_DATASET = process.env.BIGQUERY_DATASET?.trim() || "orion_analytics";
export const BQ_LOCATION = process.env.BIGQUERY_LOCATION?.trim() || "southamerica-east1";

/**
 * Datasets do warehouse (docs/orion-research + pedido 2026-07-04):
 * - raw: dados brutos das fontes (Meta) antes de qualquer processamento
 * - cortex: artefatos de decisão (recommendations, events, learnings)
 * - research: achados externos com cache/TTL (SearchAPI etc.)
 * - intelligence: agregados anonimizados cross-tenant
 * - analytics: telemetria operacional (domain_events, executions) — legado do export v1
 */
export const BQ_DATASETS = {
  raw: process.env.BIGQUERY_DATASET_RAW?.trim() || "orion_raw",
  cortex: process.env.BIGQUERY_DATASET_CORTEX?.trim() || "orion_cortex",
  research: process.env.BIGQUERY_DATASET_RESEARCH?.trim() || "orion_research",
  intelligence: process.env.BIGQUERY_DATASET_INTELLIGENCE?.trim() || "orion_intelligence",
  analytics: BQ_DATASET
} as const;

export type BqTableSpec = {
  dataset: keyof typeof BQ_DATASETS;
  name: string;
  partitionField: string;
  clustering: string[];
  schema: Array<{ name: string; type: string; mode?: string }>;
};

const ensuredDatasets = new Set<string>();
const ensuredTables = new Set<string>();

/** Garante dataset + tabela (idempotente; tolera tabelas já criadas pelo usuário). */
export async function ensureBqTable(spec: BqTableSpec) {
  const bq = await getBigQuery();
  if (!bq) return null;

  const datasetId = BQ_DATASETS[spec.dataset];
  const dataset = bq.dataset(datasetId);
  if (!ensuredDatasets.has(datasetId)) {
    const [exists] = await dataset.exists();
    if (!exists) await bq.createDataset(datasetId, { location: BQ_LOCATION });
    ensuredDatasets.add(datasetId);
  }

  const table = dataset.table(spec.name);
  const tableKey = `${datasetId}.${spec.name}`;
  if (!ensuredTables.has(tableKey)) {
    const [exists] = await table.exists();
    if (!exists) {
      await dataset.createTable(spec.name, {
        schema: spec.schema,
        timePartitioning: { type: "DAY", field: spec.partitionField },
        clustering: { fields: spec.clustering }
      });
    }
    ensuredTables.add(tableKey);
  }
  return table;
}

/**
 * Insert em lote (chunked) com `ignoreUnknownValues` — se a tabela já existir com
 * colunas diferentes das nossas, campos extras são descartados em vez de falhar tudo.
 */
export async function bqInsertRows(
  spec: BqTableSpec,
  rows: Array<Record<string, unknown>>
): Promise<boolean> {
  if (!rows.length) return true;
  const table = await ensureBqTable(spec);
  if (!table) return false;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await table.insert(rows.slice(i, i + CHUNK), { ignoreUnknownValues: true });
  }
  return true;
}

/** Query parametrizada; devolve [] quando o BQ está desabilitado. */
export async function bqQuery<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const bq = await getBigQuery();
  if (!bq) return [];
  const [rows] = await bq.query({ query, params });
  return rows as T[];
}

export function isBigQueryEnabled(): boolean {
  if (process.env.ENABLE_BIGQUERY_ANALYTICS !== "true") return false;
  return Boolean(
    process.env.BIGQUERY_CREDENTIALS_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );
}

let client: BigQuery | null = null;

/** Singleton lazy — importa o SDK só quando o plano analítico está ligado. */
export async function getBigQuery(): Promise<BigQuery | null> {
  if (!isBigQueryEnabled()) return null;
  if (client) return client;

  const { BigQuery: BigQueryCtor } = await import("@google-cloud/bigquery");
  const rawCredentials = process.env.BIGQUERY_CREDENTIALS_JSON?.trim();
  if (rawCredentials) {
    const credentials = JSON.parse(rawCredentials) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };
    client = new BigQueryCtor({
      projectId: process.env.BIGQUERY_PROJECT_ID?.trim() || credentials.project_id,
      credentials,
      location: BQ_LOCATION
    });
  } else {
    client = new BigQueryCtor({
      projectId: process.env.BIGQUERY_PROJECT_ID?.trim() || undefined,
      location: BQ_LOCATION
    });
  }
  return client;
}
