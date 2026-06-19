import { z } from "zod";

import { extractJsonFromLlmText } from "@/lib/llm/extract-json";
import { getAnthropicModel } from "@/lib/llm/keys";
import type { LlmError, LlmGenerateJsonResult } from "@/lib/llm/types";

function isRetryableAnthropicStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 500 || status === 529;
}

async function callAnthropicRaw(args: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; body: unknown }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 8192,
      temperature: args.temperature,
      messages: [{ role: "user", content: args.prompt }]
    })
  });

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    return { ok: false, status: res.status, body: json };
  }

  const text = json.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .filter(Boolean)
    .join("\n");

  if (!text) {
    return { ok: false, status: 502, body: { error: "Claude returned empty response" } };
  }

  return { ok: true, text };
}

export async function anthropicGenerateJson<T>(args: {
  apiKey: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  modelId?: string;
}): Promise<LlmGenerateJsonResult<T>> {
  const model = args.modelId?.trim() || getAnthropicModel();
  const result = await callAnthropicRaw({
    apiKey: args.apiKey,
    model,
    prompt: args.prompt,
    temperature: args.temperature ?? 0.25
  });

  if (!result.ok) {
    if (isRetryableAnthropicStatus(result.status)) {
      throw new Error(`Anthropic error: ${result.status} ${JSON.stringify(result.body)}`);
    }
    throw new Error(`Anthropic error: ${result.status} ${JSON.stringify(result.body)}`);
  }

  const parsed = extractJsonFromLlmText(result.text);
  const data = args.schema.parse(parsed);
  return {
    data,
    provider: "claude",
    modelRequested: model,
    modelUsed: model
  };
}

export function classifyAnthropicError(err: unknown): LlmError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (message.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return {
      code: "RATE_LIMIT",
      message: "Limite de requisições da Claude atingido. Tente novamente em 1–2 minutos."
    };
  }

  if (
    message.includes("502") ||
    message.includes("503") ||
    message.includes("529") ||
    lower.includes("overloaded")
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message: "Claude temporariamente indisponível. Tente novamente em instantes."
    };
  }

  if (err instanceof z.ZodError || lower.includes("zod")) {
    return {
      code: "SCHEMA_ERROR",
      message: "A Claude retornou um formato inesperado. Tente novamente."
    };
  }

  if (
    err instanceof SyntaxError ||
    lower.includes("did not return json") ||
    lower.includes("unexpected token")
  ) {
    return {
      code: "PARSE_ERROR",
      message: "Não foi possível interpretar a resposta da Claude. Tente novamente."
    };
  }

  return { code: "UNKNOWN", message: "Erro ao processar resposta da Claude." };
}
