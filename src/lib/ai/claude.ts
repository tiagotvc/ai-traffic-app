import "server-only";

/**
 * Cliente Claude (Anthropic Messages API) via `fetch` cru — espelha o padrão do
 * `gemini.ts` (sem SDK/dependência nova). Usado pelo roteador de IA.
 *
 * Importante (família 4.x / Opus 4.8): NÃO enviar `temperature`/`top_p`/`top_k`
 * (retornam 400) e `thinking` fica off por padrão (suficiente para saída JSON).
 */

export const CLAUDE_MODELS = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5"
} as const;

/** USD por 1M tokens (input/output) — referência de custo para o roteador. */
export const CLAUDE_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 }
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

export async function claudeGenerateText(args: {
  apiKey: string;
  model: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 4096,
      ...(args.system ? { system: args.system } : {}),
      messages: [{ role: "user", content: args.prompt }]
    })
  });

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    stop_reason?: string;
    error?: { message?: string; type?: string };
  };

  if (!res.ok) {
    throw new Error(`Claude error: ${res.status} ${JSON.stringify(json.error ?? json)}`);
  }
  if (json.stop_reason === "refusal") {
    throw new Error("Claude refusal");
  }

  const text = (json.content ?? [])
    .filter((b) => b?.type === "text")
    .map((b) => b?.text)
    .filter(Boolean)
    .join("\n");

  if (!text) throw new Error("Claude returned empty response");
  return text;
}
