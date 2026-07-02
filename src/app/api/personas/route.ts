import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { classifyAudienceAiError } from "@/lib/audience-api-helpers";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import { enrichTargetingWithMetaNames } from "@/lib/meta-segment-replacement";
import {
  createUserPersona,
  listUserPersonas
} from "@/lib/user-persona-zone";

const CreateSchema = z.object({
  adAccountId: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  targeting: z.record(z.string(), z.unknown()),
  sourcePrompt: z.string().optional()
});

export async function GET() {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const personas = await listUserPersonas({ tenantId: tenant.id, userId: user.id });
  return NextResponse.json({ ok: true, personas });
}

export async function POST(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = CreateSchema.parse(await req.json().catch(() => ({})));

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
      if (metaAccessToken && body.adAccountId) {
        targeting = await enrichTargetingWithMetaNames(targeting, metaAccessToken, body.adAccountId);
      }
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
    const billingRes = billingErrorResponse(e);
    if (billingRes) return billingRes;
    const classified = classifyAudienceAiError(e, "gemini");
    return NextResponse.json(
      { ok: false, error: classified.message, errorCode: classified.code },
      { status: classified.status }
    );
  }
}
