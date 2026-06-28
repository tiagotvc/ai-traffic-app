import "server-only";

import type { z } from "zod";

import { extractJson, geminiGenerateJson } from "@/lib/gemini";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

import { CLAUDE_MODELS, claudeGenerateText, getAnthropicApiKey } from "./claude";
import { GEMINI_MODELS, chooseAiModel } from "./router";
import type { AiGenerateMeta, AiModelChoice, AiProvider, AiTask } from "./types";

export type AiGenerateJsonResult<T> = { data: T; meta: AiGenerateMeta };

async function loadAvailability(hasGemini: boolean, hasClaude: boolean) {
  const [routerEnabled, geminiFlag, claudeFlag] = await Promise.all([
    isPlatformFeatureEnabled("ai.router"),
    isPlatformFeatureEnabled("ai.gemini"),
    isPlatformFeatureEnabled("ai.claude")
  ]);
  return {
    routerEnabled,
    geminiEnabled: geminiFlag && hasGemini,
    claudeEnabled: claudeFlag && hasClaude
  };
}

/** Resolve provedor + modelo via roteador Orion Brain (sem escolha do usuário). */
export async function resolveAiModelChoice(task: AiTask): Promise<AiModelChoice> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? undefined;
  const claudeKey = getAnthropicApiKey();
  const av = await loadAvailability(Boolean(geminiKey), Boolean(claudeKey));
  if (!av.geminiEnabled && !av.claudeEnabled) {
    throw new Error(
      "Nenhum provedor de IA disponível (verifique as flags ai.gemini/ai.claude e as chaves GEMINI_API_KEY/ANTHROPIC_API_KEY)."
    );
  }
  return chooseAiModel(task, av);
}

/**
 * Ponto único de geração de JSON com IA. Resolve flags + chaves, escolhe o
 * modelo via `chooseAiModel` e, em caso de falha, faz **fallback cross-provider**
 * para o outro provedor habilitado. Retorna os dados validados pelo `schema` +
 * metadados (qual provedor/modelo/razão) para telemetria e explicabilidade.
 */
export async function aiGenerateJson<T>(args: {
  task: AiTask;
  prompt: string;
  schema: z.ZodType<T>;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  geminiApiKey?: string;
  claudeApiKey?: string;
}): Promise<AiGenerateJsonResult<T>> {
  const geminiKey = args.geminiApiKey ?? process.env.GEMINI_API_KEY?.trim() ?? undefined;
  const claudeKey = args.claudeApiKey ?? getAnthropicApiKey();

  const av = await loadAvailability(Boolean(geminiKey), Boolean(claudeKey));
  if (!av.geminiEnabled && !av.claudeEnabled) {
    throw new Error(
      "Nenhum provedor de IA disponível (verifique as flags ai.gemini/ai.claude e as chaves GEMINI_API_KEY/ANTHROPIC_API_KEY)."
    );
  }

  const choice = chooseAiModel(args.task, av);

  const run = async (provider: AiProvider, model: string): Promise<T> => {
    if (provider === "claude") {
      const text = await claudeGenerateText({
        apiKey: claudeKey!,
        model,
        prompt: args.prompt,
        system: args.system,
        maxTokens: args.maxTokens
      });
      return args.schema.parse(extractJson(text));
    }
    const { data } = await geminiGenerateJson({
      apiKey: geminiKey!,
      prompt: args.system ? `${args.system}\n\n${args.prompt}` : args.prompt,
      schema: args.schema,
      temperature: args.temperature,
      modelId: model
    });
    return data;
  };

  try {
    const data = await run(choice.provider, choice.model);
    return {
      data,
      meta: { provider: choice.provider, model: choice.model, reason: choice.reason, fellBackFrom: null }
    };
  } catch (err) {
    const fallbackProvider: AiProvider = choice.provider === "claude" ? "gemini" : "claude";
    const canFallback =
      (fallbackProvider === "gemini" && av.geminiEnabled) ||
      (fallbackProvider === "claude" && av.claudeEnabled);
    if (!canFallback) throw err;

    const fbModel = fallbackProvider === "claude" ? CLAUDE_MODELS.haiku : GEMINI_MODELS.flash;
    const data = await run(fallbackProvider, fbModel);
    return {
      data,
      meta: {
        provider: fallbackProvider,
        model: fbModel,
        reason: `fallback de ${choice.provider} (${err instanceof Error ? err.message.slice(0, 80) : "erro"})`,
        fellBackFrom: { provider: choice.provider, model: choice.model }
      }
    };
  }
}
