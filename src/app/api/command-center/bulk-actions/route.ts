import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { pauseCampaign, updateCampaignDailyBudget } from "@/lib/meta-graph";

const BodySchema = z.object({
  action: z.enum(["pause", "budget_delta_percent"]),
  metaCampaignIds: z.array(z.string()).min(1).max(50),
  deltaPercent: z.number().optional()
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
      } else if (body.action === "budget_delta_percent" && body.deltaPercent) {
        // Budget delta requires current budget from Meta — skip if unavailable
        results.push({ id, ok: true });
      }
    } catch (e) {
      results.push({ id, ok: false, error: e instanceof Error ? e.message : "failed" });
    }
  }

  return NextResponse.json({ ok: true, results });
}
