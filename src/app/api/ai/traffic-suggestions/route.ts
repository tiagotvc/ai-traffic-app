import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";

export async function GET() {
  const { tenant } = await getAppContext();
  const { rows } = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    onlyAlerts: true,
    limit: 10
  });

  const suggestions = rows.map((r) => {
    if (r.cpl && r.cpl > 80) {
      return {
        type: "pause_or_review",
        clientSlug: r.clientSlug,
        metaCampaignId: r.metaCampaignId,
        text: `${r.clientName}: CPL alto (R$ ${r.cpl.toFixed(0)}) em «${r.campaignName}» — considere pausar ou revisar criativo.`
      };
    }
    if (r.roas > 0 && r.roas < 1) {
      return {
        type: "lookalike_test",
        clientSlug: r.clientSlug,
        metaCampaignId: r.metaCampaignId,
        text: `${r.clientName}: ROAS baixo em «${r.campaignName}» — teste lookalike 1% após validar pixel.`
      };
    }
    return {
      type: "review",
      clientSlug: r.clientSlug,
      metaCampaignId: r.metaCampaignId,
      text: `${r.clientName}: alerta em «${r.campaignName}» — abra o Command Center.`
    };
  });

  return NextResponse.json({ ok: true, suggestions });
}
