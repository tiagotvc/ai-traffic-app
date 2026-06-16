import { NextResponse } from "next/server";

import type { AiRunResult } from "@/lib/creative-memory/ai-analysis-types";

type AiRoutePayload<T> = AiRunResult<T> & {
  suggestions?: T[];
  hypotheses?: T[];
};

export function buildAiAnalysisResponse<T>(
  result: AiRoutePayload<T>,
  opts: {
    noApiKeyError: string;
    noMetricsMessage: string;
    noResultsMessage: string;
    genericError: string;
  }
) {
  if (result.skippedReason === "no_api_key") {
    return NextResponse.json({
      ok: false,
      code: "NO_AI_KEY",
      error: opts.noApiKeyError
    });
  }

  if (result.skippedReason === "no_metrics") {
    return NextResponse.json({
      ok: false,
      code: "NO_METRICS",
      created: 0,
      message: opts.noMetricsMessage,
      warnings: result.warnings
    });
  }

  if (result.error) {
    const status = result.error.code === "RATE_LIMIT" || result.error.code === "SERVICE_UNAVAILABLE" ? 503 : 500;
    return NextResponse.json(
      {
        ok: false,
        code: result.error.code,
        error: result.error.message
      },
      { status }
    );
  }

  if (result.created === 0) {
    return NextResponse.json({
      ok: false,
      code: "NO_RESULTS",
      created: 0,
      rejected: result.rejected,
      deduped: result.deduped,
      warnings: result.warnings,
      message: result.warnings.length ? result.warnings.join(" ") : opts.noResultsMessage,
      partial: true
    });
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    rejected: result.rejected,
    deduped: result.deduped,
    warnings: result.warnings,
    suggestions: result.suggestions,
    hypotheses: result.hypotheses,
    items: result.items,
    ai: true,
    modelUsed: result.modelMeta?.modelUsed
  });
}

export function shouldBillAiUsage<T>(result: AiRunResult<T>): boolean {
  return Boolean(result.modelMeta && result.created > 0 && !result.error);
}
