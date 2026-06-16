import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import {
  getCampaignForecast,
  listClientCampaignsForForecast
} from "@/lib/agency-brain/forecast-service";

const QuerySchema = z.object({
  campaignId: z.string().min(1).optional(),
  horizon: z.coerce.number().int().min(7).max(30).optional()
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    try {
      await assertLimit(tenant.id, "allowAgencyBrainExperiments");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const url = new URL(req.url);
    const query = QuerySchema.parse({
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      horizon: url.searchParams.get("horizon") ?? undefined
    });

    if (!query.campaignId) {
      const campaigns = await listClientCampaignsForForecast(tenant.id, client.id);
      return NextResponse.json({ ok: true, campaigns });
    }

    const forecast = await getCampaignForecast({
      tenantId: tenant.id,
      clientId: client.id,
      metaCampaignId: query.campaignId,
      horizonDays: query.horizon ?? 7
    });

    return NextResponse.json({ ok: true, forecast });
  } catch (err) {
    console.error("[experiments/forecast GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar projeção" }, { status: 500 });
  }
}
