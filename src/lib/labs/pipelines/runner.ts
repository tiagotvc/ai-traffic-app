import "server-only";

import type { CreatorNode } from "@/lib/campaign-draft";
import {
  COMPETITOR_UPFRONT_SCIENTIST,
  getCampaignWizardPipelineConfig
} from "@/lib/campaign-creator/campaign-pipeline-steps";
import {
  draftResearchCacheKey,
  getDraftResearchSection,
  getDraftResearchSections,
  setDraftResearchSection
} from "@/lib/campaign-creator/creator-brain-draft-cache";

import { runScientistSkill } from "../skills";
import type { ScientistSkillFinding, ScientistSkillInput } from "../skills/types";
import { getPipeline, type PipelineStep } from "./registry";
import type {
  PipelineEvent,
  ResearchDossier,
  ResearchScope,
  ResearchSection,
  ResearchSuggestion
} from "./types";

export type FullResearchOptions = {
  wizardStep?: CreatorNode;
  draftId?: string | null;
  clientId?: string | null;
};

/** Cientistas-base por escopo (o Testing é sempre acrescentado depois). */
function baseStepsForScope(scope: ResearchScope, options?: FullResearchOptions): PipelineStep[] {
  const marketing = getPipeline("marketing")?.steps ?? [];
  const geo = getPipeline("geo")?.steps ?? [];
  if (scope === "persona") return marketing;
  if (scope === "zone") return geo;
  if (scope === "campaign" && options?.wizardStep) {
    const { scientistIds } = getCampaignWizardPipelineConfig(options.wizardStep);
    const all = [...marketing, ...geo];
    return all.filter((step) => scientistIds.includes(step.scientistId));
  }
  return [...marketing, ...geo]; // campaign / full
}

function shouldRunTesting(scope: ResearchScope, options?: FullResearchOptions): boolean {
  if (scope === "full") return true;
  if (scope === "campaign" && options?.wizardStep) {
    return getCampaignWizardPipelineConfig(options.wizardStep).runTesting;
  }
  return scope !== "zone";
}

function dossierLabel(scope: ResearchScope, options?: FullResearchOptions): string {
  if (scope === "campaign" && options?.wizardStep) {
    const cfg = getCampaignWizardPipelineConfig(options.wizardStep);
    return cfg.labelKey;
  }
  if (scope === "persona") return "Pesquisa de Marketing";
  if (scope === "zone") return "Pesquisa Geográfica";
  return "Pesquisa completa";
}

function mergeSectionsUnique(sections: ResearchSection[]): ResearchSection[] {
  const map = new Map<string, ResearchSection>();
  for (const s of sections) map.set(s.scientistId, s);
  return [...map.values()];
}

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
  emit: (e: PipelineEvent) => void = () => {},
  scope: ResearchScope = "full",
  options?: FullResearchOptions
): Promise<ResearchDossier> {
  emit({ phase: "start" });

  const baseSteps = baseStepsForScope(scope, options);
  const sections: ResearchSection[] = [];
  const skipped: string[] = [];
  const draftId = options?.draftId ?? null;
  const clientId = options?.clientId ?? null;

  if (draftId && clientId) {
    const cached = await getDraftResearchSections(draftId, clientId);
    for (const section of cached) {
      if (baseSteps.some((s) => s.scientistId === section.scientistId)) continue;
      sections.push(section);
    }
  }

  await Promise.all(
    baseSteps.map(async (step) => {
      const cacheKey =
        draftId && clientId
          ? draftResearchCacheKey(draftId, clientId, step.scientistId)
          : null;

      if (
        cacheKey &&
        step.scientistId === COMPETITOR_UPFRONT_SCIENTIST &&
        options?.wizardStep &&
        options.wizardStep !== "campaign"
      ) {
        const cached = await getDraftResearchSection(cacheKey);
        if (cached) {
          sections.push(cached);
          emit({ phase: "scientist_start", scientistId: step.scientistId, label: step.label, icon: step.icon });
          emit({
            phase: "scientist_done",
            scientistId: step.scientistId,
            label: step.label,
            icon: step.icon,
            ran: true,
            findings: cached.findings.length
          });
          return;
        }
      }

      emit({ phase: "scientist_start", scientistId: step.scientistId, label: step.label, icon: step.icon });
      const res = await runScientistSkill(step.scientistId, input);
      const ran = res.ran && res.findings.length > 0;
      if (ran) {
        const section: ResearchSection = {
          scientistId: step.scientistId,
          label: step.label,
          icon: step.icon,
          summary: res.summary,
          confidence: res.confidence,
          findings: res.findings as ScientistSkillFinding[],
          sources: res.sources
        };
        sections.push(section);
        if (cacheKey && step.scientistId === COMPETITOR_UPFRONT_SCIENTIST) {
          await setDraftResearchSection(cacheKey, section);
        }
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

  const mergedSections = mergeSectionsUnique(sections);

  if (shouldRunTesting(scope, options)) {
    emit({ phase: "scientist_start", scientistId: "testing", label: "Testes", icon: "Beaker" });
    const priorSections =
      draftId && clientId ? mergeSectionsUnique([...mergedSections, ...(await getDraftResearchSections(draftId, clientId))]) : mergedSections;
    const priorFindings = priorSections.map((s) => ({ label: s.label, findings: s.findings }));
    const testing = await runScientistSkill("testing", { ...input, priorFindings });
    const testingRan = testing.ran && testing.findings.length > 0;
    if (testingRan) {
      mergedSections.push({
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
  }

  const label = dossierLabel(scope, options);
  const dossier: ResearchDossier = {
    pipelineId: scope === "campaign" && options?.wizardStep ? `campaign:${options.wizardStep}` : scope,
    label,
    sections: mergedSections,
    suggestions: buildSuggestions(mergedSections),
    confidence: avgConfidence(mergedSections),
    skipped
  };
  emit({ phase: "done", dossier });
  return dossier;
}

/** Versão sem streaming (usada pelo endpoint não-SSE). */
export async function runResearchWithTesting(input: ScientistSkillInput): Promise<ResearchDossier> {
  return runFullResearch(input);
}
