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
      system:
        "Responda somente com um objeto JSON válido, sem markdown, sem explicações e sem texto fora do JSON.",
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

function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

async function parseAnthropicJson<T>(args: {
  text: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const parsed = extractJsonFromLlmText(args.text);
  return args.schema.parse(parsed);
}

export async function anthropicGenerateJson<T>(args: {
  apiKey: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  modelId?: string;
}): Promise<LlmGenerateJsonResult<T>> {
  const model = args.modelId?.trim() || getAnthropicModel();
  const basePrompt = `${args.prompt}\n\nIMPORTANTE: retorne APENAS um objeto JSON válido, sem markdown.`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : `${basePrompt}\n\nA tentativa anterior não passou na validação. Corrija o JSON e use exatamente os nomes de campo pedidos no prompt.`;

    const result = await callAnthropicRaw({
      apiKey: args.apiKey,
      model,
      prompt,
      temperature: args.temperature ?? 0.25
    });

    if (!result.ok) {
      if (isRetryableAnthropicStatus(result.status)) {
        throw new Error(`Anthropic error: ${result.status} ${JSON.stringify(result.body)}`);
      }
      throw new Error(`Anthropic error: ${result.status} ${JSON.stringify(result.body)}`);
    }

    try {
      const data = await parseAnthropicJson({ text: result.text, schema: args.schema });
      return {
        data,
        provider: "claude",
        modelRequested: model,
        modelUsed: model
      };
    } catch (err) {
      lastError = err;
      if (err instanceof z.ZodError) {
        console.warn("[anthropic] schema validation failed", {
          attempt: attempt + 1,
          issues: formatZodIssues(err),
          preview: result.text.slice(0, 500)
        });
      }
      if (attempt === 0 && (err instanceof z.ZodError || err instanceof SyntaxError)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Claude JSON parse failed");
}

export function classifyAnthropicError(err: unknown): LlmError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  const anthropicDetail = extractAnthropicApiMessage(message);

  if (
    message.includes("401") ||
    lower.includes("authentication") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("invalid api key")
  ) {
    return {
      code: "NO_API_KEY",
      message:
        anthropicDetail ??
        "Chave da Claude inválida. Verifique ANTHROPIC_API_KEY no Vercel e na console da Anthropic."
    };
  }

  if (
    message.includes("402") ||
    lower.includes("credit balance") ||
    lower.includes("billing") ||
    lower.includes("purchase credits")
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message:
        anthropicDetail ??
        "Saldo ou créditos da Anthropic insuficientes. Adicione créditos em console.anthropic.com."
    };
  }

  if (message.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return {
      code: "RATE_LIMIT",
      message: anthropicDetail ?? "Limite de requisições da Claude atingido. Tente novamente em 1–2 minutos."
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
      message: anthropicDetail ?? "Claude temporariamente indisponível. Tente novamente em instantes."
    };
  }

  if (message.includes("404") || lower.includes("model:") || lower.includes("not_found")) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message:
        anthropicDetail ??
        "Modelo Claude inválido. Ajuste ANTHROPIC_MODEL (ex.: claude-sonnet-4-6) no Vercel."
    };
  }

  if (lower.includes("não selecionou segmentos válidos")) {
    return {
      code: "SCHEMA_ERROR",
      message
    };
  }

  if (err instanceof z.ZodError || lower.includes("zod")) {
    const detail = err instanceof z.ZodError ? formatZodIssues(err) : undefined;
    return {
      code: "SCHEMA_ERROR",
      message: detail
        ? `A Claude retornou um formato inesperado (${detail}). Tente novamente ou use o Gemini.`
        : "A Claude retornou um formato inesperado. Tente novamente ou use o Gemini."
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

  return {
    code: "UNKNOWN",
    message: anthropicDetail ?? message ?? "Erro ao processar resposta da Claude."
  };
}

function extractAnthropicApiMessage(message: string): string | undefined {
  const jsonStart = message.indexOf("{");
  if (jsonStart < 0) return undefined;
  try {
    const body = JSON.parse(message.slice(jsonStart)) as {
      error?: { message?: string; type?: string };
    };
    const apiMessage = body.error?.message?.trim();
    if (!apiMessage) return undefined;
    return `Claude: ${apiMessage}`;
  } catch {
    return undefined;
  }
}
