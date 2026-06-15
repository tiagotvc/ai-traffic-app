import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const clientSlug = url.searchParams.get("clientSlug");

  const { rows } = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    onlyAlerts: true,
    limit: 10
  });

  let brainSnippet: string | undefined;
  if (clientSlug) {
    const { client: clientRepo } = await repositories();
    const all = await clientRepo.find({ where: { tenantId: tenant.id } });
    const client = all.find((c) => c.name.toLowerCase().includes(clientSlug.toLowerCase()));
    if (client) {
      const ctx = await getClientBrainContext(tenant.id, client.id);
      brainSnippet = ctx.summaryText;
    }
  }

  const suggestions = rows.map((r) => {
    const brainNote = brainSnippet ? ` Memória: ${brainSnippet.slice(0, 120)}…` : "";
    if (r.cpl && r.cpl > 80) {
      return {
        type: "pause_or_review",
        clientSlug: r.clientSlug,
        metaCampaignId: r.metaCampaignId,
        text: `${r.clientName}: CPL alto (R$ ${r.cpl.toFixed(0)}) em «${r.campaignName}» — considere pausar ou revisar criativo.${brainNote}`
      };
    }
    if (r.roas > 0 && r.roas < 1) {
      return {
        type: "lookalike_test",
        clientSlug: r.clientSlug,
        metaCampaignId: r.metaCampaignId,
        text: `${r.clientName}: ROAS baixo em «${r.campaignName}» — teste lookalike 1% após validar pixel.${brainNote}`
      };
    }
    return {
      type: "review",
      clientSlug: r.clientSlug,
      metaCampaignId: r.metaCampaignId,
      text: `${r.clientName}: alerta em «${r.campaignName}» — abra o Command Center.${brainNote}`
    };
  });

  return NextResponse.json({ ok: true, suggestions, brainContextUsed: Boolean(brainSnippet) });
}
