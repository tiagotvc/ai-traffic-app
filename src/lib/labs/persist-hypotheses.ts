import "server-only";

import { createHypothesisFromDraft } from "@/lib/agency-brain/hypothesis-service";

import type { ResearchDossier } from "./pipelines/types";

function dedupeKey(title: string): string {
  return (
    "testing:" +
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60)
  );
}

/** Persiste as hipóteses do Testing Scientist em ClientHypothesis (dedupe, SUGGESTED). */
export async function persistTestingHypotheses(
  tenantId: string,
  clientId: string,
  dossier: ResearchDossier
): Promise<void> {
  const testing = dossier.sections.find((s) => s.scientistId === "testing");
  if (!testing) return;
  const hyps = testing.findings.filter((f) => f.type === "hypothesis").slice(0, 4);
  for (const h of hyps) {
    try {
      await createHypothesisFromDraft(
        tenantId,
        clientId,
        {
          title: h.title.slice(0, 200),
          description: h.body.slice(0, 800),
          category: "GENERAL",
          confidenceScore: testing.confidence ?? 40,
          evidence: { source: "testing_scientist", pipeline: dossier.pipelineId },
          dedupeKey: dedupeKey(h.title)
        },
        "RULE"
      );
    } catch {
      // best-effort: nunca quebra a resposta.
    }
  }
}
