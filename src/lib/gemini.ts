import { z } from "zod";

import type { AiAnalysisError, AiAnalysisErrorCode } from "@/lib/creative-memory/ai-analysis-types";

export type { AiAnalysisError, AiAnalysisErrorCode };

const ActionSchema = z.object({
  targetId: z.string().min(1),
  actionType: z.enum(["ALTER_BUDGET", "PAUSE_AD", "UPDATE_BID"]),
  justification: z.string().min(1),
  value: z.union([z.number(), z.string()]).optional(),
  preview: z.record(z.string(), z.unknown()).optional()
});

export const GeminiRecommendationsSchema = z.object({
  recommendations: z.array(ActionSchema).min(1)
});

export type GeminiRecommendations = z.infer<typeof GeminiRecommendationsSchema>;

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const DEFAULT_FALLBACK_CHAIN = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiModelFallbackChain(requestedModel?: string): string[] {
  const primary = requestedModel?.trim() || getGeminiModel();
  const fromEnv =
    process.env.GEMINI_MODEL_FALLBACKS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? DEFAULT_FALLBACK_CHAIN;
  return [...new Set([primary, ...fromEnv])];
}

export type GeminiGenerateMeta = {
  modelRequested: string;
  modelUsed: string;
  fallbackFrom?: string;
};

export type GeminiGenerateJsonResult<T> = GeminiGenerateMeta & { data: T };

function geminiGenerateContentUrl(model: string): URL {
  return new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  );
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1]);

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(slice);
  }
  throw new Error("Gemini did not return JSON");
}

export function classifyGeminiError(err: unknown): AiAnalysisError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (message.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return {
      code: "RATE_LIMIT",
      message: "Limite de requisições da IA atingido. Tente novamente em 1–2 minutos."
    };
  }

  if (
    message.includes("502") ||
    message.includes("503") ||
    lower.includes("empty response") ||
    lower.includes("service unavailable")
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message: "Serviço de IA temporariamente indisponível. Tente novamente em instantes."
    };
  }

  if (err instanceof z.ZodError || lower.includes("zod")) {
    return {
      code: "SCHEMA_ERROR",
      message: "A IA retornou um formato inesperado. Tente novamente."
    };
  }

  if (
    err instanceof SyntaxError ||
    lower.includes("did not return json") ||
    lower.includes("unexpected token")
  ) {
    return {
      code: "PARSE_ERROR",
      message: "Não foi possível interpretar a resposta da IA. Tente novamente."
    };
  }

  return {
    code: "UNKNOWN",
    message: "Erro ao processar análise com IA."
  };
}

function isRetryableGeminiStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 500;
}

async function callGeminiRaw(args: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; body: unknown }> {
  const url = geminiGenerateContentUrl(args.model);
  url.searchParams.set("key", args.apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: { temperature: args.temperature }
    })
  });

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    return { ok: false, status: res.status, body: json };
  }

  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("\n") ??
    undefined;

  if (!text) {
    return { ok: false, status: 502, body: { error: "Gemini returned empty response" } };
  }

  return { ok: true, text };
}

async function geminiGenerateTextWithFallback(args: {
  apiKey: string;
  prompt: string;
  temperature: number;
  modelId?: string;
  modelChain?: string[];
}): Promise<GeminiGenerateMeta & { text: string }> {
  const chain = args.modelChain?.length
    ? args.modelChain
    : getGeminiModelFallbackChain(args.modelId);
  const modelRequested = chain[0]!;
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    const result = await callGeminiRaw({
      apiKey: args.apiKey,
      model,
      prompt: args.prompt,
      temperature: args.temperature
    });

    if (result.ok) {
      return {
        text: result.text,
        modelRequested,
        modelUsed: model,
        fallbackFrom: model !== modelRequested ? modelRequested : undefined
      };
    }

    lastError = result;
    if (!isRetryableGeminiStatus(result.status) || i === chain.length - 1) {
      throw new Error(`Gemini error: ${result.status} ${JSON.stringify(result.body)}`);
    }
  }

  throw new Error(`Gemini error: ${JSON.stringify(lastError)}`);
}

export async function geminiGenerateRecommendations(args: {
  prompt: string;
  apiKey: string;
  modelId?: string;
}): Promise<GeminiRecommendations & GeminiGenerateMeta> {
  const { text, ...meta } = await geminiGenerateTextWithFallback({
    apiKey: args.apiKey,
    prompt: args.prompt,
    temperature: 0.2,
    modelId: args.modelId
  });

  const parsed = extractJson(text);
  const data = GeminiRecommendationsSchema.parse(parsed);
  return { ...data, ...meta };
}

export async function geminiGenerateJson<T>(args: {
  prompt: string;
  apiKey: string;
  schema: z.ZodType<T>;
  temperature?: number;
  modelId?: string;
  modelChain?: string[];
}): Promise<GeminiGenerateJsonResult<T>> {
  const { text, ...meta } = await geminiGenerateTextWithFallback({
    apiKey: args.apiKey,
    prompt: args.prompt,
    temperature: args.temperature ?? 0.25,
    modelId: args.modelId,
    modelChain: args.modelChain
  });

  const parsed = extractJson(text);
  const data = args.schema.parse(parsed);
  return { data, ...meta };
}
