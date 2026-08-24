import "server-only";

import { repositories } from "@/db/repositories";
import type { ScientistSkillResult } from "@/lib/commander/skills/types";

/**
 * Grava o resultado de uma execução de Scientist (rodou ou skip) — base do log por
 * cientista em `/commander/scientists`. Best-effort: nunca lança, nunca atrasa o
 * pipeline de pesquisa por causa de uma falha de escrita no banco.
 */
export async function recordScientistRun(input: {
  tenantId: string;
  clientId?: string | null;
  result: ScientistSkillResult;
}): Promise<void> {
  try {
    const { scientistRun: repo } = await repositories();
    await repo.save(
      repo.create({
        tenantId: input.tenantId,
        clientId: input.clientId ?? null,
        scientistId: input.result.scientistId,
        ran: input.result.ran,
        reason: input.result.reason ?? null,
        itemsAnalyzed: input.result.itemsAnalyzed ?? null,
        findings: input.result.findings,
        sources: input.result.sources,
        summary: input.result.summary ?? null,
        confidence: input.result.confidence ?? null
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scientist-runs] falha ao gravar execução", err);
  }
}
