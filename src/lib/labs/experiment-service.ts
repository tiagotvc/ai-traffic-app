import "server-only";

import { getDataSource } from "@/db/data-source";
import { estimateCredits, type LabsAgentRunDto, type LabsExperimentDto } from "@/lib/labs/types";

type LabsExperimentRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  client_id: string | null;
  client_name?: string | null;
  name: string;
  product: string;
  niche: string | null;
  market: string | null;
  country: string | null;
  language: string | null;
  objective: string | null;
  competitors: string[];
  website_url: string | null;
  selected_scientists: string[];
  status: string;
  estimated_credits: number;
  credits_used: number;
  max_credits: number | null;
  max_duration_minutes: number | null;
  dossier: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
};

function toDto(row: LabsExperimentRow): LabsExperimentDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    clientId: row.client_id,
    clientName: row.client_name ?? null,
    name: row.name,
    product: row.product,
    niche: row.niche,
    market: row.market,
    country: row.country,
    language: row.language,
    objective: row.objective,
    competitors: row.competitors ?? [],
    websiteUrl: row.website_url,
    selectedScientists: row.selected_scientists ?? [],
    status: row.status as LabsExperimentDto["status"],
    estimatedCredits: row.estimated_credits,
    creditsUsed: row.credits_used,
    maxCredits: row.max_credits,
    maxDurationMinutes: row.max_duration_minutes,
    dossier: row.dossier,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null
  };
}

export type CreateLabsExperimentInput = {
  name: string;
  product: string;
  clientId?: string | null;
  niche?: string | null;
  market?: string | null;
  country?: string | null;
  language?: string | null;
  objective?: string | null;
  competitors?: string[];
  websiteUrl?: string | null;
  selectedScientists: string[];
  maxCredits?: number | null;
  maxDurationMinutes?: number | null;
};

export async function listLabsExperiments(
  tenantId: string,
  clientId?: string | null
): Promise<LabsExperimentDto[]> {
  const ds = await getDataSource();
  const rows = clientId
    ? await ds.query<LabsExperimentRow[]>(
        `SELECT e.*, c.name AS client_name
         FROM labs_experiments e
         LEFT JOIN clients c ON c.id = e.client_id
         WHERE e.tenant_id = $1 AND e.client_id = $2
         ORDER BY e.created_at DESC LIMIT 50`,
        [tenantId, clientId]
      )
    : await ds.query<LabsExperimentRow[]>(
        `SELECT e.*, c.name AS client_name
         FROM labs_experiments e
         LEFT JOIN clients c ON c.id = e.client_id
         WHERE e.tenant_id = $1
         ORDER BY e.created_at DESC LIMIT 50`,
        [tenantId]
      );
  return rows.map(toDto);
}

export async function getLabsExperiment(
  tenantId: string,
  experimentId: string
): Promise<LabsExperimentDto | null> {
  const ds = await getDataSource();
  const rows = await ds.query<LabsExperimentRow[]>(
    `SELECT e.*, c.name AS client_name
     FROM labs_experiments e
     LEFT JOIN clients c ON c.id = e.client_id
     WHERE e.tenant_id = $1 AND e.id = $2 LIMIT 1`,
    [tenantId, experimentId]
  );
  return rows[0] ? toDto(rows[0]) : null;
}

export async function createLabsExperiment(
  tenantId: string,
  userId: string,
  input: CreateLabsExperimentInput
): Promise<LabsExperimentDto> {
  const estimated = estimateCredits(input.selectedScientists);
  const ds = await getDataSource();
  const rows = await ds.query<LabsExperimentRow[]>(
    `INSERT INTO labs_experiments (
      tenant_id, user_id, client_id, name, product, niche, market, country, language,
      objective, competitors, website_url, selected_scientists, status,
      estimated_credits, max_credits, max_duration_minutes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,'queued',$14,$15,$16)
    RETURNING *`,
    [
      tenantId,
      userId,
      input.clientId ?? null,
      input.name,
      input.product,
      input.niche ?? null,
      input.market ?? null,
      input.country ?? null,
      input.language ?? null,
      input.objective ?? null,
      JSON.stringify(input.competitors ?? []),
      input.websiteUrl ?? null,
      JSON.stringify(input.selectedScientists),
      estimated,
      input.maxCredits ?? null,
      input.maxDurationMinutes ?? null
    ]
  );
  return toDto(rows[0]!);
}

export async function listLabsAgentRuns(experimentId: string): Promise<LabsAgentRunDto[]> {
  const ds = await getDataSource();
  const rows = await ds.query<
    {
      id: string;
      experiment_id: string;
      scientist_id: string;
      status: string;
      summary: string | null;
      credits_used: number;
      duration_ms: number | null;
      started_at: Date;
      completed_at: Date | null;
    }[]
  >(
    `SELECT id, experiment_id, scientist_id, status, summary, credits_used, duration_ms, started_at, completed_at
     FROM labs_agent_runs WHERE experiment_id = $1 ORDER BY started_at ASC`,
    [experimentId]
  );
  return rows.map((r) => ({
    id: r.id,
    experimentId: r.experiment_id,
    scientistId: r.scientist_id,
    status: r.status,
    summary: r.summary,
    creditsUsed: r.credits_used,
    durationMs: r.duration_ms,
    startedAt: r.started_at.toISOString(),
    completedAt: r.completed_at?.toISOString() ?? null
  }));
}

export async function markLabsExperimentFailed(
  experimentId: string,
  errorMessage: string
): Promise<void> {
  const ds = await getDataSource();
  await ds.query(
    `UPDATE labs_experiments SET status = 'failed', error_message = $2, completed_at = now() WHERE id = $1`,
    [experimentId, errorMessage]
  );
}
