import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { checkCustomAudienceTos, validateClientAdAccount } from "@/lib/audience-api-helpers";
import { createCombinedCustomAudience } from "@/lib/meta-audience-create";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  name: z.string().min(1),
  includeAudienceIds: z.array(z.string().min(1)).min(1),
  excludeAudienceIds: z.array(z.string().min(1)).optional()
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

  const tos = await checkCustomAudienceTos(metaAccessToken, body.adAccountId);
  if (!tos.accepted) {
    return NextResponse.json(
      { ok: false, error: "Aceite os termos de públicos personalizados na Meta", tosUrl: tos.url },
      { status: 403 }
    );
  }

  try {
    const created = await createCombinedCustomAudience(metaAccessToken, body.adAccountId, {
      name: body.name,
      includeAudienceIds: body.includeAudienceIds,
      excludeAudienceIds: body.excludeAudienceIds
    });
    return NextResponse.json({ ok: true, audienceId: created.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha ao combinar públicos" },
      { status: 500 }
    );
  }
}
