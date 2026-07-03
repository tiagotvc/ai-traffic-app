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
