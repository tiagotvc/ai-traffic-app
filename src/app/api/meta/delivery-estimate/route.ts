import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { DraftTargetingSchema } from "@/lib/campaign-draft";
import { draftTargetingToApi } from "@/lib/campaign-draft";
import { buildMetaTargetingSpec } from "@/lib/meta-campaign";
import { fetchDeliveryEstimate } from "@/lib/meta-graph";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  targeting: DraftTargetingSchema
});

export async function POST(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const { clientId, adAccountId, targeting } = parsed.data;
  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const token =
    metaAccessToken ?? (await getMetaAccessTokenForAdAccount(tenant.id, user.id, adAccountId));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const apiInput = draftTargetingToApi(targeting);
  const hasGeo =
    (apiInput.countries?.length ?? 0) > 0 ||
    (apiInput.cities?.length ?? 0) > 0 ||
    (apiInput.customLocations?.length ?? 0) > 0;

  if (!hasGeo) {
    return NextResponse.json({ ok: true, estimateReady: false, reason: "no_geo" });
  }

  try {
    const rawSpec = buildMetaTargetingSpec(apiInput);
    const targetingSpec = sanitizeTargetingForMeta(rawSpec);
    const estimate = await fetchDeliveryEstimate(token, adAccountId, targetingSpec);
    return NextResponse.json({ ok: true, ...estimate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha na estimativa";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
