import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import type { GeminiGenerateMeta } from "@/lib/gemini";
import { generateImagesFromPromptCF } from "@/lib/cloudflare-image";
import { getTopPerformingAdHook } from "@/lib/creative-studio/top-performer";

export const CREATIVE_STUDIO_FORMATS = ["feed", "story", "landscape"] as const;
export type CreativeStudioFormat = (typeof CREATIVE_STUDIO_FORMATS)[number];

export const CREATIVE_STUDIO_STYLES = ["photo", "bold", "minimal"] as const;
export type CreativeStudioStyle = (typeof CREATIVE_STUDIO_STYLES)[number];

const FORMAT_ASPECT: Record<CreativeStudioFormat, "1:1" | "9:16" | "16:9"> = {
  feed: "1:1",
  story: "9:16",
  landscape: "16:9"
};

const STYLE_PROMPT: Record<CreativeStudioStyle, string> = {
  photo: "realistic professional photography, natural lighting, high detail",
  bold: "bold vibrant colors, high contrast, eye-catching social ad style",
  minimal: "clean minimal composition, lots of negative space, soft palette"
};

// Modelo único (FLUX Schnell) pros 3 estilos — testado direto na API: Leonardo Phoenix/Lucid
// Origin custam ~40x mais neurons por imagem (só a cota de tile já estoura em ~4-5 gerações,
// travando a cota do DIA INTEIRO pra todo mundo, inclusive os estilos baratos). Diferenciação
// entre estilos fica só no texto do prompt — seguro e testado ao vivo.

export type CreativeStudioVariant = {
  imageBase64: string;
  mimeType: string;
  headline: string;
  body: string;
};

export type CreativeStudioInsight = {
  adName: string;
  ctr: number;
};

export type CreativeStudioResult = {
  variants: CreativeStudioVariant[];
  insight: CreativeStudioInsight | null;
  modelMeta: GeminiGenerateMeta;
};

const CopySchema = z.object({
  variants: z
    .array(
      z.object({
        headline: z.string().min(3).max(90),
        body: z.string().min(10).max(200)
      })
    )
    .min(1)
});

function buildImagePrompt(description: string, style: CreativeStudioStyle, angle: string): string {
  // O headline/corpo já aparecem como texto de verdade fora da imagem — a foto NUNCA deve
  // tentar escrever nada sozinha (modelos rápidos como o Schnell renderizam texto ilegível,
  // pior ainda em português). Repetir a restrição de formas diferentes ajuda o modelo a
  // realmente respeitar — instrução única costuma ser ignorada nesses modelos.
  return `Professional advertising photograph for: ${description}. Creative angle for this specific shot: "${angle}". Style: ${STYLE_PROMPT[style]}. Pure photography, no graphic design elements. Absolutely no text, no words, no letters, no captions, no typography, no logos, no writing of any kind anywhere in the frame — image only. Natural, anatomically correct hands and body proportions, avoid close-up hand gestures. Clean, brand-safe composition suitable as a social media ad background.`;
}

export async function generateCreativeStudioBatch(args: {
  tenantId: string;
  clientId: string;
  clientName: string;
  description: string;
  format: CreativeStudioFormat;
  style: CreativeStudioStyle;
  count?: number;
  /** Fases reais (não decorativas) — mesmo padrão do `askCommander`, pra UI de progresso. */
  emit?: (phase: string) => void;
  /** Emitido assim que CADA variação (imagem+copy) fica pronta — não espera o lote inteiro,
   * pra UI mostrar os cards um a um em vez de uma espera cega até o fim. */
  onVariant?: (variant: CreativeStudioVariant, index: number, total: number) => void;
}): Promise<CreativeStudioResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiApiKey) {
    throw new Error("Gemini não configurado no servidor (GEMINI_API_KEY ausente).");
  }
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!cfAccountId || !cfApiToken) {
    throw new Error(
      "Geração de imagem não configurada no servidor (CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN ausentes)."
    );
  }

  const count = Math.min(4, Math.max(1, args.count ?? 4));

  const insight = await getTopPerformingAdHook(args.tenantId, args.clientId).catch(() => null);

  const insightLine = insight
    ? `Gancho de melhor performance real deste cliente nas últimas semanas: "${insight.adName}" (CTR ${insight.ctr.toFixed(2)}%). Use esse ângulo como referência forte pras variações, sem copiar literalmente.`
    : "Sem histórico de performance suficiente ainda — use o bom senso de copywriting para anúncios de resposta direta.";

  const copyPrompt = `Cliente: ${args.clientName}
Oferta/produto descrito pelo usuário: "${args.description}"
Formato do anúncio: ${args.format}
Estilo visual: ${args.style}
${insightLine}

Gere exatamente ${count} variações de copy para anúncio (headline curta + corpo curto, tom direto e humano, sem emojis em excesso, sem promessas exageradas). Cada variação deve ser um ângulo diferente da mesma oferta.`;

  args.emit?.("Gerando copy…");
  const { data: copy, meta } = await aiGenerateJson({
    task: { kind: "creative", complexity: "medium", label: "creative-studio-copy" },
    prompt: copyPrompt,
    schema: CopySchema,
    geminiApiKey
  });

  const variantsCopy = copy.variants.slice(0, count);
  const variants: CreativeStudioVariant[] = [];

  // Uma imagem por vez (não em lote) — cada card já nasce ancorado no ângulo do SEU próprio
  // headline (não uma imagem genérica repetida), e a UI recebe cada variação assim que fica
  // pronta em vez de esperar as 4 no escuro.
  for (let i = 0; i < variantsCopy.length; i++) {
    const c = variantsCopy[i]!;
    args.emit?.(`Gerando imagem ${i + 1}/${variantsCopy.length}…`);
    const [image] = await generateImagesFromPromptCF({
      accountId: cfAccountId,
      apiToken: cfApiToken,
      prompt: buildImagePrompt(args.description, args.style, c.headline),
      aspectRatio: FORMAT_ASPECT[args.format],
      count: 1
    });
    const variant: CreativeStudioVariant = {
      imageBase64: image?.imageBase64 ?? "",
      mimeType: image?.mimeType ?? "image/png",
      headline: c.headline,
      body: c.body
    };
    variants.push(variant);
    args.onVariant?.(variant, i, variantsCopy.length);
  }

  return {
    variants,
    insight,
    modelMeta: {
      modelRequested: meta.fellBackFrom?.model ?? meta.model,
      modelUsed: meta.model,
      fallbackFrom: meta.fellBackFrom
        ? `${meta.fellBackFrom.provider}:${meta.fellBackFrom.model}`
        : undefined,
      usage: meta.usage
    }
  };
}
