import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { canUseCommander } from "@/lib/commander/access";
import { generateCommanderVerdict, type CommanderVerdictDomain } from "@/lib/commander/verdict";
import {
  aiCreditsErrorResponse,
  assertCreativeMemoryAiAccess,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { classifyLlmError, llmErrorHttpStatus } from "@/lib/llm/generate-json";

const BodySchema = z.object({
  domain: z.enum(["campaign", "persona", "zone"]),
  // Zonas não têm cliente associado (mesmo padrão de /api/zones/ai-generate).
  clientSlug: z.string().min(1).optional(),
  contextSummary: z.string().max(6000),
  checklist: z
    .array(z.object({ label: z.string().max(200), complete: z.boolean() }))
    .max(20)
    .optional()
});

/**
 * Veredito final do Commander (Review step / modal de resumo) — mesmo gate composto do
 * chat (`/api/commander/ask`): flag de plataforma por domínio + `canUseCommander` +
 * créditos de IA (mesmo bucket `kind: "chat"`). Uma chamada por revisão, não por passo.
 */
export async function POST(req: Request) {
  try {
    const { tenant, user, platformAdmin, entitlements } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const domain: CommanderVerdictDomain = body.domain;

    const moduleFlag = domain === "campaign" ? "commander.modules.campaigns" : "commander.modules.audiences";
    const context = { userId: user.id, isPlatformAdmin: platformAdmin };
    const commanderPlatform = await isPlatformFeatureEnabled(moduleFlag, context);
    const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
    const allowed = canUseCommander({
      planSlug: entitlements.planSlug,
      allowCommander: entitlements.limits.allowCommander,
      platformEnabled: commanderPlatform,
      environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
      platformAdmin,
      userEnabled: !userDisabled.has("commander") && !userDisabled.has(moduleFlag)
    });
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Commander indisponível no seu plano" }, { status: 403 });
    }

    if (domain !== "zone" && !body.clientSlug) {
      return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
    }

    const client = body.clientSlug ? await getClientBySlugOrId(tenant.id, body.clientSlug) : null;
    if (body.clientSlug && !client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    try {
      await assertCreativeMemoryAiAccess(tenant.id, client?.id, "chat");
    } catch (err) {
      const creditsRes = aiCreditsErrorResponse(err);
      if (creditsRes) return creditsRes;
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const { verdict, meta } = await generateCommanderVerdict({
      domain,
      contextSummary: body.contextSummary,
      checklist: body.checklist ?? []
    });

    if (client) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "chat",
        createdCount: 1,
        modelMeta: {
          modelRequested: meta.model,
          modelUsed: meta.model,
          fallbackFrom: meta.fellBackFrom?.model,
          usage: meta.usage
        }
      });
    }

    return NextResponse.json({ ok: true, verdict });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
    }
    console.error("[commander verdict]", err);
    const classified = classifyLlmError(err);
    return NextResponse.json(
      { ok: false, error: classified.message || "Erro ao gerar veredito" },
      { status: llmErrorHttpStatus(classified) }
    );
  }
}
