import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { chargeOrRespond, recordAiCreditUsage } from "@/lib/ai-credits";
import { generateAdCopy } from "@/lib/campaign-creator-ai";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

const BodySchema = z.object({
  prompt: z.string().min(3),
  objective: z.string().min(1),
  locale: z.string().default("pt-BR"),
  countTitles: z.number().min(1).max(5).default(3),
  countBodies: z.number().min(1).max(5).default(2),
  clientId: z.string().optional()
});

export async function POST(req: Request) {
  try {
    await assertFeatureEnabled("campaigns.ai-copy");

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { tenant } = await getAppContext();

    let clientContext: string | undefined;
    let resolvedClientId: string | null = null;
    if (body.clientId) {
      const client = await getClientBySlugOrId(tenant.id, body.clientId);
      if (client) {
        resolvedClientId = client.id;
        try {
          const brain = await getClientBrainContext(tenant.id, client.id);
          clientContext = brain.summaryText;
        } catch {
          /* optional */
        }
      }
    }

    const charge = await chargeOrRespond({
      tenantId: tenant.id,
      clientId: resolvedClientId,
      kind: "ad_copy_generate",
      requireCreativeMemory: false
    });
    if (!charge.ok) return charge.response;

    const data = await generateAdCopy({
      apiKey,
      prompt: body.prompt,
      objective: body.objective,
      locale: body.locale,
      countTitles: body.countTitles,
      countBodies: body.countBodies,
      clientContext
    });
    await recordAiCreditUsage({
      tenantId: tenant.id,
      clientId: resolvedClientId,
      kind: "ad_copy_generate",
      createdCount: 1,
      creditsCharged: charge.creditsCharged
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
