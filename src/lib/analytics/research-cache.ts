import "server-only";

import { randomUUID } from "crypto";

import { bqInsertRows, bqQuery, isBigQueryEnabled } from "@/lib/analytics/bigquery-client";
import { BQ_DATASETS } from "@/lib/analytics/bigquery-client";
import { SPEC_EXTERNAL_FINDINGS } from "@/lib/analytics/bq-warehouse";
import type { ResearchFindingDraft } from "@/lib/commander/researcher";

/**
 * Cache de pesquisa externa em `orion_research.external_findings` (regras do warehouse):
 * antes de QUALQUER chamada ao SearchAPI/fonte externa, consultar por
 * (tenant, client, source, query) com `expires_at > now()`. Hit = zero custo de fonte.
 * Miss = a fonte roda, o resultado é salvo aqui com TTL e só então volta ao Cortex.
 * BQ desligado ⇒ transparente (retorna null e o fluxo segue com os caches existentes).
 */

const DEFAULT_TTL_HOURS = 72;

type ExternalFindingRow = {
  category: string | null;
  title: string | null;
  summary: string | null;
  confidence: number | null;
  evidence: string | null;
};

export async function getCachedExternalFindings(args: {
  tenantId: string;
  clientId?: string | null;
  source: string;
  query: string;
}): Promise<ResearchFindingDraft[] | null> {
  if (!isBigQueryEnabled()) return null;
  try {
    const rows = await bqQuery<ExternalFindingRow>(
      `SELECT category, title, summary, confidence, evidence
       FROM \`${BQ_DATASETS.research}.external_findings\`
       WHERE tenant_id = @tenantId
         AND source = @source
         AND query = @query
         AND (client_id = @clientId OR (client_id IS NULL AND @clientId IS NULL))
         AND expires_at > CURRENT_TIMESTAMP()
       ORDER BY created_at DESC
       LIMIT 20`,
      {
        tenantId: args.tenantId,
        clientId: args.clientId ?? null,
        source: args.source,
        query: args.query
      }
    );
    if (!rows.length) return null;
    return rows.map((r) => ({
      source: args.source,
      category: (r.category ?? "other") as ResearchFindingDraft["category"],
      entity: args.query,
      title: r.title,
      summary: r.summary ?? "",
      confidence: r.confidence,
      evidence: r.evidence ? safeParse(r.evidence) : null
    }));
  } catch (err) {
    console.error("[research-cache] lookup failed", err);
    return null; // cache é otimização — falha nunca bloqueia a pesquisa
  }
}

export async function saveExternalFindings(
  args: { tenantId: string; clientId?: string | null; source: string; query: string; ttlHours?: number },
  findings: ResearchFindingDraft[]
): Promise<void> {
  if (!isBigQueryEnabled() || !findings.length) return;
  try {
    const now = new Date();
    const expires = new Date(now.getTime() + (args.ttlHours ?? DEFAULT_TTL_HOURS) * 3600 * 1000);
    await bqInsertRows(
      SPEC_EXTERNAL_FINDINGS,
      findings.slice(0, 50).map((f) => ({
        id: randomUUID(),
        tenant_id: args.tenantId,
        client_id: args.clientId ?? null,
        source: args.source,
        query: args.query,
        category: f.category,
        title: f.title ?? null,
        summary: f.summary,
        confidence: f.confidence ?? null,
        evidence: f.evidence ? JSON.stringify(f.evidence) : null,
        research_job_id: f.researchJobId ?? null,
        created_at: now.toISOString(),
        expires_at: expires.toISOString()
      }))
    );
  } catch (err) {
    console.error("[research-cache] save failed", err);
  }
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}
