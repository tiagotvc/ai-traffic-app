import { CLAUDE_MODELS } from "./claude";
import type { AiModelChoice, AiTask } from "./types";

/**
 * Roteador de IA — escolhe **provedor + modelo** por tarefa, equilibrando
 * **economia** (Gemini Flash/Flash-Lite, barato e rápido) e **acertividade**
 * (Claude Sonnet/Opus, mais caro e mais capaz).
 *
 * Função **pura** (sem I/O) → testável. A resolução das flags e das chaves de
 * API fica em `generate.ts`, que passa a disponibilidade efetiva pra cá.
 */

export const GEMINI_MODELS = {
  flashLite: "gemini-2.5-flash-lite",
  flash: "gemini-2.5-flash"
} as const;

/** Tarefas que exigem acertividade → tier Claude. */
const ACCURACY_KINDS = new Set<AiTask["kind"]>(["agent_proposal", "reasoning", "analysis"]);
/** Tarefas baratas/alto volume → tier Gemini Flash-Lite. */
const CHEAP_KINDS = new Set<AiTask["kind"]>(["classification", "extraction"]);

export type AiProviderAvailability = {
  /** flag `ai.router` — desligado = comportamento legado (só Gemini) */
  routerEnabled: boolean;
  /** flag `ai.gemini` E chave presente */
  geminiEnabled: boolean;
  /** flag `ai.claude` E chave presente */
  claudeEnabled: boolean;
};

function gemini(model: string, reason: string): AiModelChoice {
  return { provider: "gemini", model, reason };
}
function claude(model: string, reason: string): AiModelChoice {
  return { provider: "claude", model, reason };
}

export function chooseAiModel(task: AiTask, av: AiProviderAvailability): AiModelChoice {
  const complexity = task.complexity ?? "medium";
  const wantAccuracy =
    Boolean(task.accuracyCritical) || ACCURACY_KINDS.has(task.kind) || complexity === "high";
  const wantCheap = CHEAP_KINDS.has(task.kind) || (Boolean(task.latencySensitive) && !wantAccuracy);

  // Roteador desligado → comportamento legado (Gemini), com Claude como reserva.
  if (!av.routerEnabled) {
    if (av.geminiEnabled) {
      return gemini(wantCheap ? GEMINI_MODELS.flashLite : GEMINI_MODELS.flash, "router off → gemini");
    }
    if (av.claudeEnabled) return claude(CLAUDE_MODELS.sonnet, "router off + gemini indisponível → claude");
    return gemini(GEMINI_MODELS.flashLite, "nenhum provedor habilitado");
  }

  // Acertividade → Claude (Opus para o mais difícil, Sonnet para o resto).
  if (wantAccuracy && av.claudeEnabled) {
    const useOpus = Boolean(task.accuracyCritical) || complexity === "high";
    return claude(
      useOpus ? CLAUDE_MODELS.opus : CLAUDE_MODELS.sonnet,
      `acertividade (${task.kind}/${complexity}) → claude`
    );
  }

  // Econômico/alto volume → Gemini Flash-Lite.
  if (wantCheap && av.geminiEnabled) {
    return gemini(GEMINI_MODELS.flashLite, `tarefa barata (${task.kind}) → gemini flash-lite`);
  }

  // Balanceado → Gemini Flash; se Gemini off, Claude Sonnet.
  if (av.geminiEnabled) return gemini(GEMINI_MODELS.flash, `balanceado (${task.kind}) → gemini flash`);
  if (av.claudeEnabled) return claude(CLAUDE_MODELS.sonnet, `balanceado, gemini off → claude sonnet`);

  return gemini(GEMINI_MODELS.flashLite, "nenhum provedor habilitado");
}
