import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  AudiencePersonaPreviewPayloadSchema,
  AudienceTargetingBriefSchema,
  generateAudiencePersonaPreview,
  generateAudienceTargetingSuggestion
} from "@/lib/audience-targeting-ai";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { assertCreativeMemoryAiAccess } from "@/lib/creative-memory/ai-usage";
import { classifyLlmError } from "@/lib/llm/generate-json";
import { getApiKeyForProvider, getLlmProvidersStatus } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";
import { fetchCustomAudiences } from "@/lib/meta-graph";
import { createUserPersona } from "@/lib/user-persona-zone";

const BriefFieldsSchema = AudienceTargetingBriefSchema.extend({
  provider: z.enum(["gemini", "claude"]).default("gemini")
});

const PersonaPreviewSchema = BriefFieldsSchema.extend({
  phase: z.literal("preview")
});

const PersonaTargetingSchema = BriefFieldsSchema.extend({
  phase: z.literal("targeting"),
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  persona: AudiencePersonaPreviewPayloadSchema
});

const PersonaBuildSchema = BriefFieldsSchema.extend({
  phase: z.literal("build"),
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  persona: AudiencePersonaPreviewPayloadSchema,
  suggestion: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    name: z.string().min(1),
    targeting: z.record(z.string(), z.unknown())
  })
});

const PersonaSaveSchema = z.object({
  phase: z.literal("save"),
  name: z.string().min(1),
  description: z.string().optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  targeting: z.record(z.string(), z.unknown()),
  sourcePrompt: z.string().optional()
});

const BodySchema = z.discriminatedUnion("phase", [
  PersonaPreviewSchema,
  PersonaTargetingSchema,
  PersonaBuildSchema,
  PersonaSaveSchema
]);

function stripPersonaTargeting(targeting: Record<string, unknown>) {
  const t = { ...targeting };
  delete t.geo_locations;
  delete t.custom_audiences;
  delete t.excluded_custom_audiences;
  return t;
}

function buildSourcePrompt(brief: z.infer<typeof BriefFieldsSchema>) {
  return [
    brief.businessDescription,
    brief.targetProfile,
    brief.behaviors,
    brief.lifestyleHints
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);
}

export async function GET() {
  return NextResponse.json({ ok: true, providers: getLlmProvidersStatus() });
}

export async function POST(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.phase === "save") {
    const persona = await createUserPersona({
      tenantId: tenant.id,
      userId: user.id,
      name: body.name,
      description: body.description,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      gender: body.gender,
      targeting: body.targeting,
      sourcePrompt: body.sourcePrompt
    });
    return NextResponse.json({ ok: true, persona });
  }

  const provider = body.provider as LlmProviderId;
  if (!getApiKeyForProvider(provider)) {
    return NextResponse.json({ ok: false, error: "IA não configurada" }, { status: 503 });
  }

  try {
    await assertCreativeMemoryAiAccess(tenant.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Limite de IA atingido";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  if (body.phase === "preview") {
    try {
      const brief = AudienceTargetingBriefSchema.parse(body);
      const persona = await generateAudiencePersonaPreview({ provider, brief });
      return NextResponse.json({ ok: true, persona });
    } catch (e) {
      const classified = classifyLlmError(e, provider);
      return NextResponse.json({ ok: false, error: classified.message }, { status: 502 });
    }
  }

  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const brief = AudienceTargetingBriefSchema.parse({
      ...body,
      gender: body.gender ?? body.persona.suggestedGender
    });

    const audiences = await fetchCustomAudiences(metaAccessToken, body.adAccountId);
    const suggestion = await generateAudienceTargetingSuggestion({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      provider,
      brief,
      persona: { ...body.persona, provider, modelUsed: body.persona.modelUsed ?? "" },
      customAudiences: audiences.map((a) => ({
        id: a.id,
        name: a.name,
        subtype: a.subtype
      }))
    });

    const personaTargeting = stripPersonaTargeting(suggestion.targeting);

    if (body.phase === "targeting") {
      return NextResponse.json({
        ok: true,
        suggestion: { ...suggestion, targeting: personaTargeting }
      });
    }

    const savedTargeting = stripPersonaTargeting(body.suggestion.targeting);

    const savedPersona = await createUserPersona({
      tenantId: tenant.id,
      userId: user.id,
      name: body.persona.personaName || body.suggestion.title,
      description: body.suggestion.summary,
      ageMin: brief.ageMin,
      ageMax: brief.ageMax,
      gender: body.persona.suggestedGender ?? brief.gender,
      targeting: savedTargeting,
      sourcePrompt: buildSourcePrompt(body)
    });

    return NextResponse.json({
      ok: true,
      persona: savedPersona,
      suggestion: { ...suggestion, targeting: personaTargeting }
    });
  } catch (e) {
    const classified = classifyLlmError(e, provider);
    return NextResponse.json({ ok: false, error: classified.message }, { status: 502 });
  }
}
