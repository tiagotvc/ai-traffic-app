import "server-only";

import { getAppShellContext } from "@/lib/app-shell-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

import { competitorSkill } from "./competitor-skill";
import { confidenceSkill } from "./confidence-skill";
import { consumerSkill } from "./consumer-skill";
import { geoSkill } from "./geo-skill";
import { hypothesisSkill } from "./hypothesis-skill";
import { performanceSkill } from "./performance-skill";
import { testingSkill } from "./testing-skill";
import { trendSkill } from "./trend-skill";
import type { ScientistSkill, ScientistSkillInput, ScientistSkillResult } from "./types";

export type { ScientistSkill, ScientistSkillInput, ScientistSkillResult } from "./types";

/** Registro de skills de cientista (a "fábrica"). Adicionar novos cientistas aqui. */
const SKILLS: Record<string, ScientistSkill> = {
  competitor: competitorSkill,
  geo: geoSkill,
  testing: testingSkill,
  trend: trendSkill,
  consumer: consumerSkill,
  performance: performanceSkill,
  hypothesis: hypothesisSkill,
  confidence: confidenceSkill
};

/** Preferência do usuário (não é flag de plataforma): ele desligou o Commander/este cientista. */
async function isUserDisabled(flagId: string): Promise<boolean> {
  try {
    const { tenant } = await getAppShellContext();
    const disabled = tenant.commanderDisabledCapabilities ?? [];
    return disabled.includes("commander") || disabled.includes(flagId);
  } catch {
    return false;
  }
}

/** Executa uma skill de cientista respeitando a flag de plataforma e a preferência do usuário. */
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
  if (await isUserDisabled(skill.flagId)) {
    return { scientistId: id, ran: false, reason: "user_disabled", findings: [], sources: [] };
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
