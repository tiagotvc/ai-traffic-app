import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { aiGenerateJson } from "@/lib/ai/generate";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertCopilotAccess } from "@/lib/billing/entitlements";

const BodySchema = z.object({
  clientSlug: z.string().min(1),
  objective: z.enum(["traffic", "leads", "sales"]),
  business: z.string().min(10).max(3000),
  landingPage: z.string().url(),
  location: z.string().max(300).optional()
});

const SuggestionsSchema = z.object({
  campaignName: z.string().max(120),
  groups: z.array(z.object({
    name: z.string().max(120),
    keywords: z.array(z.string().max(80)).min(3).max(30),
    negativeKeywords: z.array(z.string().max(80)).max(20),
    headlines: z.array(z.string().max(30)).min(3).max(15),
    descriptions: z.array(z.string().max(90)).min(2).max(4)
  })).min(1).max(8)
});

export async function POST(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    try { await assertCopilotAccess(tenant.id); } catch (error) {
      const response = billingErrorResponse(error);
      if (response) return response;
      throw error;
    }
    const { data, meta } = await aiGenerateJson({
      task: { kind: "creative", complexity: "medium", label: "google-search-campaign-draft" },
      schema: SuggestionsSchema,
      temperature: 0.6,
      system: "Você é estrategista de Google Ads especializado em campanhas de Pesquisa no Brasil. Nunca invente preços, garantias, certificações ou fatos não fornecidos.",
      prompt: `Crie uma estrutura editável para Google Ads Search. Cliente: ${client.name}. Objetivo: ${body.objective}. Negócio/oferta: ${body.business}. Landing page: ${body.landingPage}. Local: ${body.location || "não informado"}. Separe grupos por intenção, evite sobreposição, gere keywords de alta intenção, negativas úteis e anúncios responsivos variados. Títulos até 30 caracteres e descrições até 90. Retorne somente JSON.`
    });
    return NextResponse.json({ ok: true, suggestions: data, model: meta.model, provider: meta.provider });
  } catch (error) {
    console.error("[google creator ai]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao gerar sugestões" }, { status: 500 });
  }
}
