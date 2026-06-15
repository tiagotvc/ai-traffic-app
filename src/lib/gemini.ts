import { z } from "zod";

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

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function geminiGenerateContentUrl(model?: string): URL {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model ?? getGeminiModel()}:generateContent`
  );
  return url;
}

function extractJson(text: string): unknown {
  // Prefer fenced JSON blocks first.
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1]);

  // Fallback: first {...} blob.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(slice);
  }
  throw new Error("Gemini did not return JSON");
}

export async function geminiGenerateRecommendations(args: {
  prompt: string;
  apiKey: string;
}): Promise<GeminiRecommendations> {
  const url = geminiGenerateContentUrl();
  url.searchParams.set("key", args.apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status} ${JSON.stringify(json)}`);
  }

  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
    undefined;

  if (!text) throw new Error("Gemini returned empty response");

  const parsed = extractJson(text);
  return GeminiRecommendationsSchema.parse(parsed);
}

export async function geminiGenerateJson<T>(args: {
  prompt: string;
  apiKey: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const url = geminiGenerateContentUrl();
  url.searchParams.set("key", args.apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: { temperature: args.temperature ?? 0.25 }
    })
  });

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status} ${JSON.stringify(json)}`);
  }

  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("\n") ??
    undefined;

  if (!text) throw new Error("Gemini returned empty response");

  const parsed = extractJson(text);
  return args.schema.parse(parsed);
}

