import { z } from "zod";

import { anthropicGenerateJson, classifyAnthropicError } from "@/lib/llm/anthropic";
import { getApiKeyForProvider } from "@/lib/llm/keys";
import type { LlmError, LlmGenerateJsonArgs, LlmGenerateJsonResult } from "@/lib/llm/types";
import { classifyGeminiError, geminiGenerateJson } from "@/lib/gemini";

export function classifyLlmError(err: unknown, provider?: "gemini" | "claude"): LlmError {
  if (provider === "claude") return classifyAnthropicError(err);
  const gemini = classifyGeminiError(err);
  return { code: gemini.code as LlmError["code"], message: gemini.message };
}

export async function llmGenerateJson<T>(
  args: LlmGenerateJsonArgs<T>
): Promise<LlmGenerateJsonResult<T>> {
  const apiKey = getApiKeyForProvider(args.provider);
  if (!apiKey) {
    throw new Error(
      args.provider === "claude" ? "ANTHROPIC_API_KEY não configurada" : "GEMINI_API_KEY não configurada"
    );
  }

  if (args.provider === "claude") {
    return anthropicGenerateJson({
      apiKey,
      prompt: args.prompt,
      schema: args.schema,
      temperature: args.temperature,
      modelId: args.modelId
    });
  }

  const result = await geminiGenerateJson({
    apiKey,
    prompt: args.prompt,
    schema: args.schema,
    temperature: args.temperature,
    modelId: args.modelId
  });

  return {
    data: result.data,
    provider: "gemini",
    modelRequested: result.modelRequested,
    modelUsed: result.modelUsed,
    fallbackFrom: result.fallbackFrom
  };
}

export { z };
