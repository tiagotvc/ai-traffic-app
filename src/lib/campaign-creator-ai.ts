import { z } from "zod";

import { geminiGenerateJson } from "@/lib/gemini";

const CopySchema = z.object({
  titles: z.array(z.string()).min(1),
  bodies: z.array(z.string()).min(1)
});

export async function generateAdCopy(args: {
  prompt: string;
  objective: string;
  locale: string;
  countTitles: number;
  countBodies: number;
  clientContext?: string;
  apiKey: string;
}): Promise<{ titles: string[]; bodies: string[] }> {
  const lang = args.locale.startsWith("en") ? "English" : "Brazilian Portuguese";
  const contextBlock = args.clientContext
    ? `\nClient context:\n${args.clientContext.slice(0, 2000)}\n`
    : "";

  const prompt = `You are an expert Meta Ads copywriter.
Write ad copy in ${lang} for a campaign with objective: ${args.objective}.
User brief: ${args.prompt}
${contextBlock}
Return JSON only: { "titles": string[${args.countTitles}], "bodies": string[${args.countBodies}] }
Each title max 40 chars when possible. Each body max 125 chars when possible. No hashtags.`;

  const { data } = await geminiGenerateJson({
    apiKey: args.apiKey,
    prompt,
    schema: CopySchema,
    temperature: 0.7
  });
  return data;
}
