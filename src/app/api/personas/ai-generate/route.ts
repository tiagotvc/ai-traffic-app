import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import {
  AudiencePersonaPreviewPayloadSchema,
  AudienceTargetingBriefSchema,
  generateAdditionalAudienceSegments,
  generateAudiencePersonaPreview,
  generateAudienceTargetingSuggestion
} from "@/lib/audience-targeting-ai";
import { validateClientAdAccount, classifyAudienceAiError, fetchCustomAudiencesOptional } from "@/lib/audience-api-helpers";
import { assertCreativeMemoryAiAccess } from "@/lib/creative-memory/ai-usage";
import { classifyLlmError } from "@/lib/llm/generate-json";
import { runPersonaAiWithRouter } from "@/lib/ai/persona-provider";
import { getLlmProvidersStatus } from "@/lib/llm/keys";
import { createUserPersona, getUserPersona, updateUserPersona } from "@/lib/user-persona-zone";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import { enrichTargetingWithMetaNames } from "@/lib/meta-segment-replacement";

const BriefFieldsSchema = AudienceTargetingBriefSchema.extend({
  provider: z.enum(["gemini", "claude"]).optional()
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

const PersonaRepairSchema = BriefFieldsSchema.extend({
  phase: z.literal("repair"),
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  personaId: z.string().min(1),
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
  adAccountId: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  targeting: z.record(z.string(), z.unknown()),
  sourcePrompt: z.string().optional()
});

const SegmentItemSchema = z.object({
  type: z.enum(["interest", "behavior", "demographic"]),
  id: z.string().min(1),
  name: z.string().min(1)
});

const PersonaAddSegmentsSchema = BriefFieldsSchema.extend({
  phase: z.literal("add_segments"),
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  persona: AudiencePersonaPreviewPayloadSchema,
  keepItems: z.array(SegmentItemSchema),
  addPrompt: z.string().min(3).max(500),
  suggestionMeta: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    name: z.string().min(1),
    includeCustomAudienceIds: z.array(z.string()).default([]),
    excludeCustomAudienceIds: z.array(z.string()).default([]),
    provider: z.enum(["gemini", "claude"]),
    modelUsed: z.string()
  })
});

const BodySchema = z.discriminatedUnion("phase", [
  PersonaPreviewSchema,
  PersonaTargetingSchema,
  PersonaAddSegmentsSchema,
  PersonaBuildSchema,
  PersonaRepairSchema,
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
  const providers = getLlmProvidersStatus();
  return NextResponse.json({
    ok: true,
    providers,
    aiAvailable: providers.gemini || providers.claude
  });
}

export async function POST(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.phase === "save") {
    try {
      let targeting = body.targeting;
      let removedSegments: Array<{ id: string; name?: string }> | undefined;
      if (metaAccessToken && body.adAccountId) {
        const finalized = await finalizeFlexibleSpecTargeting(
          targeting,
          metaAccessToken,
          body.adAccountId
        );
        targeting = finalized.targeting;
        removedSegments = finalized.removed.length ? finalized.removed : undefined;
      }
      const persona = await createUserPersona({
        tenantId: tenant.id,
        userId: user.id,
        name: body.name,
        description: body.description,
        ageMin: body.ageMin,
        ageMax: body.ageMax,
        gender: body.gender,
        targeting,
        sourcePrompt: body.sourcePrompt
      });
      return NextResponse.json({ ok: true, persona, removedSegments });
    } catch (e) {
      const classified = classifyAudienceAiError(e, "gemini");
      return NextResponse.json(
        { ok: false, error: classified.message, errorCode: classified.code },
        { status: classified.status }
      );
    }
  }

  const provider = body.provider as "gemini" | "claude" | undefined;

  try {
    await assertCreativeMemoryAiAccess(tenant.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Limite de IA atingido";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  if (body.phase === "preview") {
    try {
      const brief = AudienceTargetingBriefSchema.parse(body);
      const { result: persona, provider: usedProvider } = await runPersonaAiWithRouter("preview", (p) =>
        generateAudiencePersonaPreview({ provider: p, brief })
      );
      return NextResponse.json({ ok: true, persona, provider: usedProvider });
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

  const accessToken =
    (await getMetaAccessTokenForAdAccount(tenant.id, user.id, body.adAccountId)) ?? metaAccessToken;
  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sem acesso à conta de anúncios. Reconecte em Configurações → Reconectar Meta e selecione esta conta."
      },
      { status: 403 }
    );
  }

  if (body.phase === "add_segments") {
    try {
      const brief = AudienceTargetingBriefSchema.parse({
        ...body,
        gender: body.gender ?? body.persona.suggestedGender
      });
      const { result: suggestion, provider: usedProvider } = await runPersonaAiWithRouter(
        "add_segments",
        (p) =>
          generateAdditionalAudienceSegments({
            accessToken,
            adAccountId: body.adAccountId,
            provider: p,
            brief,
            persona: { ...body.persona, provider: p, modelUsed: body.persona.modelUsed ?? p },
            keepItems: body.keepItems,
            addPrompt: body.addPrompt,
            existingMeta: body.suggestionMeta,
            personaOnly: true
          })
      );
      return NextResponse.json({
        ok: true,
        suggestion: { ...suggestion, targeting: stripPersonaTargeting(suggestion.targeting) },
        provider: usedProvider
      });
    } catch (e) {
      const classified = classifyAudienceAiError(e, provider ?? "gemini");
      return NextResponse.json(
        { ok: false, error: classified.message, errorCode: classified.code },
        { status: classified.status }
      );
    }
  }

  try {
    const brief = AudienceTargetingBriefSchema.parse({
      ...body,
      gender: body.gender ?? body.persona.suggestedGender
    });

    const audiences = await fetchCustomAudiencesOptional(accessToken, body.adAccountId);
    const { result: suggestion, provider: usedProvider } = await runPersonaAiWithRouter("targeting", (p) =>
      generateAudienceTargetingSuggestion({
        accessToken,
        adAccountId: body.adAccountId,
        provider: p,
        brief,
        persona: { ...body.persona, provider: p, modelUsed: body.persona.modelUsed ?? "" },
        customAudiences: audiences.map((a) => ({
          id: a.id,
          name: a.name,
          subtype: a.subtype
        }))
      })
    );

    const personaTargeting = stripPersonaTargeting(suggestion.targeting);

    if (body.phase === "targeting") {
      return NextResponse.json({
        ok: true,
        suggestion: { ...suggestion, targeting: personaTargeting },
        provider: usedProvider
      });
    }

    const savedTargeting = stripPersonaTargeting(body.suggestion.targeting);
    const { targeting: validatedTargeting, removed } = await finalizeFlexibleSpecTargeting(
      savedTargeting,
      accessToken,
      body.adAccountId
    );
    const namedTargeting = await enrichTargetingWithMetaNames(
      validatedTargeting,
      accessToken,
      body.adAccountId
    );

    if (body.phase === "repair") {
      const existing = await getUserPersona({
        tenantId: tenant.id,
        userId: user.id,
        id: body.personaId
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "Persona não encontrada" }, { status: 404 });
      }
      const updated = await updateUserPersona(existing, {
        name: body.suggestion.name || body.persona.personaName || body.suggestion.title,
        description: body.suggestion.summary,
        ageMin: brief.ageMin,
        ageMax: brief.ageMax,
        gender: body.persona.suggestedGender ?? brief.gender,
        targeting: namedTargeting,
        sourcePrompt: buildSourcePrompt(body)
      });
      return NextResponse.json({
        ok: true,
        persona: updated,
        suggestion: { ...suggestion, targeting: personaTargeting },
        removedSegments: removed.length ? removed : undefined
      });
    }

    const savedPersona = await createUserPersona({
      tenantId: tenant.id,
      userId: user.id,
      name: body.suggestion.name || body.persona.personaName || body.suggestion.title,
      description: body.suggestion.summary,
      ageMin: brief.ageMin,
      ageMax: brief.ageMax,
      gender: body.persona.suggestedGender ?? brief.gender,
      targeting: namedTargeting,
      sourcePrompt: buildSourcePrompt(body)
    });

    return NextResponse.json({
      ok: true,
      persona: savedPersona,
      suggestion: { ...suggestion, targeting: personaTargeting },
      removedSegments: removed.length ? removed : undefined
    });
  } catch (e) {
    const classified = classifyAudienceAiError(e, provider ?? "gemini");
    return NextResponse.json(
      { ok: false, error: classified.message, errorCode: classified.code },
      { status: classified.status }
    );
  }
}
