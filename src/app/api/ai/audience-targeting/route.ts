import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  AudiencePersonaPreviewSchema,
  AudienceTargetingBriefSchema,
  generateAdditionalAudienceSegments,
  generateAudiencePersonaPreview,
  generateAudienceTargetingSuggestion,
  AudiencePersonaPreviewPayloadSchema
} from "@/lib/audience-targeting-ai";
import { validateClientAdAccount, classifyAudienceAiError, fetchCustomAudiencesOptional } from "@/lib/audience-api-helpers";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertCopilotAccess } from "@/lib/billing/entitlements";
import { assertCreativeMemoryAiAccess } from "@/lib/creative-memory/ai-usage";
import { classifyLlmError } from "@/lib/llm/generate-json";
import { getApiKeyForProvider, getLlmProvidersStatus } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";
import { persistSavedAudience } from "@/lib/persist-saved-audience";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";

const BriefFieldsSchema = AudienceTargetingBriefSchema.extend({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  provider: z.enum(["gemini", "claude"]).default("gemini")
});

const PersonaPostSchema = BriefFieldsSchema.extend({
  phase: z.literal("persona")
});

const TargetingPostSchema = BriefFieldsSchema.extend({
  phase: z.literal("targeting"),
  persona: AudiencePersonaPreviewPayloadSchema
});

const SegmentItemSchema = z.object({
  type: z.enum(["interest", "behavior", "demographic"]),
  id: z.string().min(1),
  name: z.string().min(1)
});

const AddSegmentsPostSchema = BriefFieldsSchema.extend({
  phase: z.literal("add_segments"),
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

const PostBodySchema = z.discriminatedUnion("phase", [
  PersonaPostSchema,
  TargetingPostSchema,
  AddSegmentsPostSchema
]);

const CreateBodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  name: z.string().min(1),
  targeting: z.record(z.string(), z.unknown()),
  provider: z.enum(["gemini", "claude"]).optional()
});

export async function GET() {
  return NextResponse.json({ ok: true, providers: getLlmProvidersStatus() });
}

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();

  // Gate do Copilot (persona/zona são geração assistida do Copilot).
  try {
    await assertCopilotAccess(tenant.id);
  } catch (err) {
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const body = PostBodySchema.parse(await req.json().catch(() => ({})));

  if (!getApiKeyForProvider(body.provider as LlmProviderId)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          body.provider === "claude"
            ? "Claude não configurada. Adicione ANTHROPIC_API_KEY no servidor."
            : "Gemini não configurado."
      },
      { status: 503 }
    );
  }

  try {
    await assertCreativeMemoryAiAccess(tenant.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Limite de IA atingido";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { clientId, adAccountId, provider, ...brief } = body;

  try {
    if (body.phase === "persona") {
      const persona = await generateAudiencePersonaPreview({
        provider: provider as LlmProviderId,
        brief
      });

      return NextResponse.json({
        ok: true,
        persona,
        providers: getLlmProvidersStatus()
      });
    }

    if (body.phase === "add_segments") {
      if (!metaAccessToken) {
        return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
      }
      const suggestion = await generateAdditionalAudienceSegments({
        accessToken: metaAccessToken,
        adAccountId,
        provider: provider as LlmProviderId,
        brief,
        persona: {
          ...body.persona,
          provider: provider as LlmProviderId,
          modelUsed: body.persona.modelUsed ?? provider
        },
        keepItems: body.keepItems,
        addPrompt: body.addPrompt,
        existingMeta: body.suggestionMeta,
        clientName: client.name,
        personaOnly: false
      });

      return NextResponse.json({
        ok: true,
        suggestion,
        providers: getLlmProvidersStatus()
      });
    }

    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const audiences = await fetchCustomAudiencesOptional(metaAccessToken, adAccountId);
    const suggestion = await generateAudienceTargetingSuggestion({
      accessToken: metaAccessToken,
      adAccountId,
      provider: provider as LlmProviderId,
      brief,
      persona: {
        ...body.persona,
        provider: provider as LlmProviderId,
        modelUsed: body.persona.modelUsed ?? provider
      },
      clientName: client.name,
      customAudiences: audiences.map((a) => ({
        id: a.id,
        name: a.name,
        subtype: a.subtype
      }))
    });

    return NextResponse.json({
      ok: true,
      suggestion,
      providers: getLlmProvidersStatus()
    });
  } catch (e) {
    console.error("[audience-targeting] failed", {
      phase: body.phase,
      provider,
      clientId,
      adAccountId,
      error: e instanceof Error ? e.message : e
    });
    const classified = classifyAudienceAiError(e, provider as LlmProviderId);
    return NextResponse.json(
      { ok: false, error: classified.message, errorCode: classified.code },
      { status: classified.status }
    );
  }
}

/** Cria público salvo na Meta após revisão do usuário. */
export async function PUT(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = CreateBodySchema.parse(await req.json().catch(() => ({})));
  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const result = await persistSavedAudience({
      tenantId: tenant.id,
      clientIdOrSlug: body.clientId,
      adAccountId: body.adAccountId,
      name: body.name,
      targeting: sanitizeTargetingForMeta(body.targeting),
      metaAccessToken
    });
    return NextResponse.json({
      ok: true,
      savedAudienceId: result.savedAudienceId,
      storage: result.storage,
      warning: result.warning,
      removedSegments: result.removedSegments,
      name: body.name
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha ao criar público salvo" },
      { status: 500 }
    );
  }
}
