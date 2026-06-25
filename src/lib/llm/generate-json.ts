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

export function llmErrorHttpStatus(error: LlmError): number {
  switch (error.code) {
    case "NO_API_KEY":
    case "SERVICE_UNAVAILABLE":
      return 503;
    case "RATE_LIMIT":
      return 429;
    case "SCHEMA_ERROR":
    case "PARSE_ERROR":
      return 502;
    default:
      return 500;
  }
}

export function isTemporaryLlmError(err: unknown, provider?: "gemini" | "claude"): boolean {
  const classified = classifyLlmError(err, provider);
  const msg = classified.message.toLowerCase();
  return (
    classified.code === "RATE_LIMIT" ||
    classified.code === "SERVICE_UNAVAILABLE" ||
    msg.includes("indisponível") ||
    msg.includes("unavailable")
  );
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
