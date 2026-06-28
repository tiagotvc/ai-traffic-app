import "server-only";

import { withProviderFallback } from "@/lib/campaign-creator/ai-wizard-prepare";
import type { LlmProviderId } from "@/lib/llm/types";

import { resolveAiModelChoice } from "./generate";
import type { AiTaskKind } from "./types";

export type PersonaAiPhase = "preview" | "targeting" | "add_segments";

function taskKindForPhase(phase: PersonaAiPhase): AiTaskKind {
  return phase === "preview" ? "reasoning" : "analysis";
}

/** Escolhe provedor via roteador Orion Brain (mesmo motor do Cérebro da Agência). */
export async function resolvePersonaAiProvider(phase: PersonaAiPhase): Promise<LlmProviderId> {
  const choice = await resolveAiModelChoice({
    kind: taskKindForPhase(phase),
    complexity: "medium",
    label: `persona.${phase}`
  });
  return choice.provider;
}

export async function runPersonaAiWithRouter<T>(
  phase: PersonaAiPhase,
  fn: (provider: LlmProviderId) => Promise<T>
): Promise<{ result: T; provider: LlmProviderId }> {
  const preferred = await resolvePersonaAiProvider(phase);
  return withProviderFallback(preferred, fn);
}
