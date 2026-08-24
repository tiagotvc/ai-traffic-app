import { NextResponse } from "next/server";

import { runBigQueryExport } from "@/lib/analytics/bq-export";

export const maxDuration = 300;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Export incremental Postgres → BigQuery (plano analítico, docs/orion-architecture §5).
 * Roda de hora em hora; com `ENABLE_BIGQUERY_ANALYTICS` desligado é um no-op barato.
 */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runBigQueryExport();

    // Brain › Benchmarking (Fase 5): após o export, materializa os agregados por nicho
    // no Postgres — é o ÚNICO ponto que lê o BigQuery (best-effort).
    let benchmarks: { enabled: boolean; niches: number } | { error: string } = {
      enabled: false,
      niches: 0
    };
    if (summary.enabled) {
      try {
        const { refreshNicheBenchmarks } = await import("@/lib/brain/niche-benchmarks");
        benchmarks = await refreshNicheBenchmarks();
      } catch (err) {
        benchmarks = { error: err instanceof Error ? err.message : "erro no benchmark" };
        console.error("[cron bq-export] benchmark refresh failed", err);
      }
    }

    // orion_intelligence.global_learnings — agregado anônimo (opt-in, ≥2 clientes).
    let globalLearnings: { rows: number } | { error: string } = { rows: 0 };
    if (summary.enabled) {
      try {
        const { aggregateGlobalLearnings } = await import("@/lib/brain/global-learnings");
        globalLearnings = await aggregateGlobalLearnings();
      } catch (err) {
        globalLearnings = { error: err instanceof Error ? err.message : "erro no agregado" };
        console.error("[cron bq-export] global learnings failed", err);
      }
    }

    return NextResponse.json({ ok: true, ...summary, benchmarks, globalLearnings });
  } catch (err) {
    console.error("[cron bq-export]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro no export" },
      { status: 500 }
    );
  }
}

/** Vercel Cron chama via GET. */
export async function GET(req: Request) {
  return POST(req);
}
