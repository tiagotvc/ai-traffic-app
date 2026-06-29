import "server-only";

import { runScientistSkill } from "../skills";
import type { ScientistSkillFinding, ScientistSkillInput } from "../skills/types";
import { getPipeline } from "./registry";
import type {
  PipelineEvent,
  ResearchDossier,
  ResearchSection,
  ResearchSuggestion
} from "./types";

/** Tipos de finding que viram "sugestão acionável" no consolidado. */
const ACTIONABLE = new Set([
  "hypothesis",
  "test",
  "prediction",
  "suggestion",
  "gap",
  "avoid",
  "angle",
  "offer",
  "hook"
]);
/** Achados do Testing têm prioridade nas sugestões. */
const TOP_PRIORITY = new Set(["hypothesis", "test", "prediction"]);

function buildSuggestions(sections: ResearchSection[]): ResearchSuggestion[] {
  const out: ResearchSuggestion[] = [];
  for (const s of sections) {
    for (const f of s.findings) {
      if (!ACTIONABLE.has(f.type)) continue;
      out.push({
        title: f.title,
        body: f.body,
        priority: TOP_PRIORITY.has(f.type) || f.type === "avoid" || f.type === "gap" ? "high" : "medium"
      });
    }
  }
  // prioriza high, mantém ordem, limita.
  return out.sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0)).slice(0, 6);
}

function avgConfidence(sections: ResearchSection[]): number | undefined {
  const vals = sections.map((s) => s.confidence).filter((c): c is number => typeof c === "number");
  if (!vals.length) return undefined;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * Roda uma pipeline de pesquisa: executa os cientistas (respeitando flag/cache),
 * monta uma seção por cientista que rodou e consolida sugestões. Os cientistas são
 * independentes aqui → rodam em paralelo. (O Testing Scientist, que consome os
 * outros, será composto à parte.)
 */
export async function runResearchPipeline(
  pipelineId: string,
  input: ScientistSkillInput
): Promise<ResearchDossier | null> {
  const def = getPipeline(pipelineId);
  if (!def) return null;

  const results = await Promise.all(
    def.steps.map(async (step) => ({ step, res: await runScientistSkill(step.scientistId, input) }))
  );

  const sections: ResearchSection[] = [];
  const skipped: string[] = [];
  for (const { step, res } of results) {
    if (res.ran && res.findings.length) {
      sections.push({
        scientistId: step.scientistId,
        label: step.label,
        icon: step.icon,
        summary: res.summary,
        confidence: res.confidence,
        findings: res.findings as ScientistSkillFinding[],
        sources: res.sources
      });
    } else {
      skipped.push(step.scientistId);
    }
  }

  return {
    pipelineId: def.id,
    label: def.label,
    sections,
    suggestions: buildSuggestions(sections),
    confidence: avgConfidence(sections),
    skipped
  };
}

/**
 * Dossiê COMPLETO com PROGRESSO em tempo real: roda marketing + geo (em paralelo,
 * emitindo start/done por cientista), depois o Testing Scientist (que consome os
 * achados), emitindo eventos via `emit`. Devolve o dossiê único.
 */
export async function runFullResearch(
  input: ScientistSkillInput,
  emit: (e: PipelineEvent) => void = () => {}
): Promise<ResearchDossier> {
  emit({ phase: "start" });

  const baseSteps = [...(getPipeline("marketing")?.steps ?? []), ...(getPipeline("geo")?.steps ?? [])];
  const sections: ResearchSection[] = [];
  const skipped: string[] = [];

  await Promise.all(
    baseSteps.map(async (step) => {
      emit({ phase: "scientist_start", scientistId: step.scientistId, label: step.label, icon: step.icon });
      const res = await runScientistSkill(step.scientistId, input);
      const ran = res.ran && res.findings.length > 0;
      if (ran) {
        sections.push({
          scientistId: step.scientistId,
          label: step.label,
          icon: step.icon,
          summary: res.summary,
          confidence: res.confidence,
          findings: res.findings as ScientistSkillFinding[],
          sources: res.sources
        });
      } else {
        skipped.push(step.scientistId);
      }
      emit({
        phase: "scientist_done",
        scientistId: step.scientistId,
        label: step.label,
        icon: step.icon,
        ran,
        findings: res.findings.length
      });
    })
  );

  // Testing Scientist consome os achados anteriores (simulação).
  emit({ phase: "scientist_start", scientistId: "testing", label: "Testes", icon: "Beaker" });
  const priorFindings = sections.map((s) => ({ label: s.label, findings: s.findings }));
  const testing = await runScientistSkill("testing", { ...input, priorFindings });
  const testingRan = testing.ran && testing.findings.length > 0;
  if (testingRan) {
    sections.push({
      scientistId: "testing",
      label: "Testes",
      icon: "Beaker",
      summary: testing.summary,
      confidence: testing.confidence,
      findings: testing.findings as ScientistSkillFinding[],
      sources: testing.sources
    });
  } else {
    skipped.push("testing");
  }
  emit({
    phase: "scientist_done",
    scientistId: "testing",
    label: "Testes",
    icon: "Beaker",
    ran: testingRan,
    findings: testing.findings.length
  });

  const dossier: ResearchDossier = {
    pipelineId: "full",
    label: "Pesquisa completa",
    sections,
    suggestions: buildSuggestions(sections),
    confidence: avgConfidence(sections),
    skipped
  };
  emit({ phase: "done", dossier });
  return dossier;
}

/** Versão sem streaming (usada pelo endpoint não-SSE). */
export async function runResearchWithTesting(input: ScientistSkillInput): Promise<ResearchDossier> {
  return runFullResearch(input);
}
