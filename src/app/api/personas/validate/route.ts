import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { resolveWorkspaceMetaAccessToken } from "@/lib/meta-auth-store";
import {
  autoFixPersonasTargeting,
  inspectPersonasTargeting,
  summarizePersonasTargeting
} from "@/lib/persona-targeting-audit";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";

const BodySchema = z
  .object({
    adAccountId: z.string().min(1),
    personaIds: z.array(z.string().min(1)).optional(),
    autoFix: z.boolean().optional(),
    findReplacements: z.boolean().optional(),
    includeSummaries: z.boolean().optional(),
    targeting: z.record(z.string(), z.unknown()).optional()
  })
  .refine((data) => !!data.targeting || (data.personaIds?.length ?? 0) > 0, {
    message: "personaIds ou targeting obrigatório"
  });

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const accessToken =
    (await getMetaAccessTokenForAdAccount(tenant.id, user.id, body.adAccountId)) ??
    (await resolveWorkspaceMetaAccessToken(tenant.id, user.id));
  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "META_OFFICIAL_CONNECTION_REQUIRED",
        error:
          "A conexão Meta oficial do workspace não tem acesso a esta conta. O responsável pela conexão (em Configurações) precisa reconectar e autorizar a conta de anúncios."
      },
      { status: 403 }
    );
  }

  if (body.targeting) {
    try {
      const { targeting, removed } = await finalizeFlexibleSpecTargeting(
        body.targeting,
        accessToken,
        body.adAccountId
      );
      return NextResponse.json({
        ok: true,
        valid: true,
        targeting,
        removedSegments: removed.length ? removed : undefined
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Segmentação inválida";
      return NextResponse.json({ ok: false, valid: false, error: message }, { status: 400 });
    }
  }

  if (body.autoFix) {
    const personaIds = body.personaIds ?? [];
    if (!personaIds.length) {
      return NextResponse.json({ ok: false, error: "personaIds obrigatório" }, { status: 400 });
    }
    const { fixedPersonaIds, skipped } = await autoFixPersonasTargeting({
      tenantId: tenant.id,
      userId: user.id,
      accessToken: accessToken,
      adAccountId: body.adAccountId,
      personaIds,
      tryReplace: body.findReplacements !== false
    });
    return NextResponse.json({
      ok: true,
      fixedPersonaIds,
      skipped,
      hasIssues: skipped.length > 0
    });
  }

  const issues = await inspectPersonasTargeting({
    tenantId: tenant.id,
    userId: user.id,
    accessToken: accessToken,
    adAccountId: body.adAccountId,
    personaIds: body.personaIds ?? [],
    findReplacements: body.findReplacements !== false
  });

  const summaries =
    body.includeSummaries === false
      ? []
      : await summarizePersonasTargeting({
          tenantId: tenant.id,
          userId: user.id,
          accessToken: accessToken,
          adAccountId: body.adAccountId,
          personaIds: body.personaIds ?? []
        });

  return NextResponse.json({
    ok: true,
    issues,
    summaries,
    hasIssues: issues.length > 0
  });
}
