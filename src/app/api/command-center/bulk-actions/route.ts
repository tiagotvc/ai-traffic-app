import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { formatMetaGraphError } from "@/lib/meta-error";
import {
  activateCampaign,
  fetchCampaign,
  pauseCampaign,
  updateCampaignDailyBudget
} from "@/lib/meta-graph";

const BodySchema = z.object({
  action: z.enum(["pause", "activate", "budget_delta_percent", "budget_set_minor"]),
  metaCampaignIds: z.array(z.string()).min(1).max(50),
  deltaPercent: z.number().optional(),
  budgetMinor: z.number().int().positive().optional()
});

export async function POST(req: Request) {
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const id of body.metaCampaignIds) {
    try {
      if (body.action === "pause") {
        await pauseCampaign(metaAccessToken, id);
        results.push({ id, ok: true });
      } else if (body.action === "activate") {
        await activateCampaign(metaAccessToken, id);
        results.push({ id, ok: true });
      } else if (body.action === "budget_set_minor" && body.budgetMinor) {
        await updateCampaignDailyBudget(metaAccessToken, id, body.budgetMinor);
        results.push({ id, ok: true });
      } else if (body.action === "budget_delta_percent" && body.deltaPercent) {
        const camp = await fetchCampaign(metaAccessToken, id);
        const current = Number(camp.daily_budget ?? 0);
        if (!current) {
          results.push({ id, ok: false, error: "Campanha sem orçamento diário definido" });
          continue;
        }
        const next = Math.max(
          100,
          Math.round(current * (1 + body.deltaPercent / 100))
        );
        await updateCampaignDailyBudget(metaAccessToken, id, next);
        results.push({ id, ok: true });
      } else {
        results.push({ id, ok: false, error: "Ação inválida ou parâmetros ausentes" });
      }
    } catch (e) {
      results.push({ id, ok: false, error: formatMetaGraphError(e) });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: okCount > 0,
    results,
    message: `${okCount}/${results.length} campanhas atualizadas`
  });
}
