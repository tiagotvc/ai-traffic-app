import "server-only";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

import { competitorSkill } from "./competitor-skill";
import { geoSkill } from "./geo-skill";
import { testingSkill } from "./testing-skill";
import type { ScientistSkill, ScientistSkillInput, ScientistSkillResult } from "./types";

export type { ScientistSkill, ScientistSkillInput, ScientistSkillResult } from "./types";

/** Registro de skills de cientista (a "fábrica"). Adicionar novos cientistas aqui. */
const SKILLS: Record<string, ScientistSkill> = {
  competitor: competitorSkill,
  geo: geoSkill,
  testing: testingSkill
};

/** Executa uma skill de cientista respeitando a flag de plataforma. */
export async function runScientistSkill(
  id: string,
  input: ScientistSkillInput
): Promise<ScientistSkillResult> {
  const skill = SKILLS[id];
  if (!skill) {
    return { scientistId: id, ran: false, reason: "unknown_scientist", findings: [], sources: [] };
  }
  if (!(await isPlatformFeatureEnabled(skill.flagId))) {
    return { scientistId: id, ran: false, reason: "disabled", findings: [], sources: [] };
  }
  if (!skill.canRun(input)) {
    return { scientistId: id, ran: false, reason: "insufficient_input", findings: [], sources: [] };
  }
  try {
    return await skill.run(input);
  } catch (e) {
    return {
      scientistId: id,
      ran: false,
      reason: e instanceof Error ? e.message : "error",
      findings: [],
      sources: []
    };
  }
}
