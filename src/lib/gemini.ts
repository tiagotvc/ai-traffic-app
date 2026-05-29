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
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
  );
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

