import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  getAudienceBreakdownContext,
  syncAudienceInsightBreakdowns
} from "@/lib/audience-insight-breakdowns";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import { classifyLlmError, llmGenerateJson } from "@/lib/llm/generate-json";
import { getApiKeyForProvider } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";
import { fetchCustomAudiences } from "@/lib/meta-graph";
import {
  ENGAGEMENT_ACTIONS,
  ENGAGEMENT_SOURCES,
  WEBSITE_PIXEL_EVENTS
} from "@/lib/meta-audience-create";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  baseAudienceIds: z.array(z.string()).default([]),
  prompt: z.string().min(3).max(2000),
  count: z.number().int().min(1).max(5).default(3),
  provider: z.enum(["gemini", "claude"]).default("gemini")
});

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["website", "engagement", "lookalike", "combined", "saved_targeting"]),
      name: z.string(),
      payload: z.record(z.string(), z.unknown()),
      reason: z.string().optional()
    })
  )
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const apiKey = getApiKeyForProvider(body.provider as LlmProviderId);
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          body.provider === "claude"
            ? "Claude não configurada. Adicione ANTHROPIC_API_KEY."
            : "Gemini não configurado."
      },
      { status: 503 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  try {
    await syncAudienceInsightBreakdowns({
      clientId: client.id,
      metaAdAccountId: body.adAccountId,
      accessToken: metaAccessToken
    });
  } catch {
    /* continue with cached or empty breakdowns */
  }

  const [breakdowns, campaigns, audiences] = await Promise.all([
    getAudienceBreakdownContext(client.id, body.adAccountId),
    queryCommandCenterCampaigns({ tenantId: tenant.id, clientIds: [client.id], limit: 15 }),
    fetchCustomAudiences(metaAccessToken, body.adAccountId)
  ]);

  const baseAudiences = audiences.filter((a) => body.baseAudienceIds.includes(a.id));
  const topCampaigns = campaigns.rows.slice(0, 10).map((r) => ({
    name: r.campaignName,
    spend: r.spend,
    conversions: r.conversions,
    roas: r.roas,
    cpa: r.cpa,
    ctr: r.ctr
  }));

  const systemPrompt = `Você é um especialista em públicos Meta Ads. Gere exatamente ${body.count} sugestões de novos públicos.
Tipos permitidos: website, engagement, lookalike, combined, saved_targeting.
Para website use payload: { pixelId?, eventName, retentionDays (1-180), urlContains? }.
Para engagement: { sourceType: page|ig_business|video|lead, sourceId?, eventName, retentionDays }.
Para lookalike: { originAudienceId, ratio (0.01-0.1), country }.
Para combined: { includeAudienceIds: string[], excludeAudienceIds?: string[] }.
Para saved_targeting: { targeting: { age_min?, age_max?, genders?, geo_locations?, flexible_spec? } }.
Responda JSON: { "suggestions": [...] }`;

  const userPrompt = JSON.stringify({
    userPrompt: body.prompt,
    baseAudiences: baseAudiences.map((a) => ({
      id: a.id,
      name: a.name,
      subtype: a.subtype
    })),
    demographicBreakdowns: breakdowns,
    topCampaigns,
    websiteEvents: WEBSITE_PIXEL_EVENTS.map((e) => e.metaEvent),
    engagementSources: ENGAGEMENT_SOURCES,
    engagementActions: ENGAGEMENT_ACTIONS,
    allAudienceIds: audiences.slice(0, 30).map((a) => ({ id: a.id, name: a.name, subtype: a.subtype }))
  });

  const prompt = [
    systemPrompt,
    "",
    "Dados:",
    userPrompt
  ].join("\n");

  try {
    const result = await llmGenerateJson({
      provider: body.provider as LlmProviderId,
      prompt,
      schema: SuggestionSchema
    });
    return NextResponse.json({
      ok: true,
      suggestions: result.data.suggestions.slice(0, body.count),
      provider: result.provider,
      modelUsed: result.modelUsed,
      contextUsed: {
        breakdownCount: breakdowns.length,
        campaignCount: topCampaigns.length,
        baseAudienceCount: baseAudiences.length
      }
    });
  } catch (e) {
    const classified = classifyLlmError(e, body.provider as LlmProviderId);
    return NextResponse.json({ ok: false, error: classified.message }, { status: 502 });
  }
}
