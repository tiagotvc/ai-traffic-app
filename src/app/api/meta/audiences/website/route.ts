import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { checkCustomAudienceTos, validateClientAdAccount } from "@/lib/audience-api-helpers";
import { createWebsiteCustomAudience, WEBSITE_MAX_RETENTION_DAYS } from "@/lib/meta-audience-create";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  name: z.string().min(1),
  pixelId: z.string().min(1),
  eventName: z.string().min(1),
  retentionDays: z.number().int().min(1).max(WEBSITE_MAX_RETENTION_DAYS),
  urlContains: z.string().optional()
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const tos = await checkCustomAudienceTos(metaAccessToken);
  if (!tos.accepted) {
    return NextResponse.json(
      { ok: false, error: "Aceite os termos de públicos personalizados na Meta", tosUrl: tos.url },
      { status: 403 }
    );
  }

  try {
    const created = await createWebsiteCustomAudience(metaAccessToken, body.adAccountId, {
      name: body.name,
      pixelId: body.pixelId,
      eventName: body.eventName,
      retentionDays: body.retentionDays,
      urlContains: body.urlContains
    });
    return NextResponse.json({ ok: true, audienceId: created.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha ao criar público" },
      { status: 500 }
    );
  }
}
