import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  activateCampaign,
  pauseCampaign,
  updateCampaignDailyBudget
} from "@/lib/meta-graph";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("activate") }),
  z.object({
    action: z.literal("update_budget"),
    dailyBudgetBrl: z.number().positive()
  })
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.action === "pause") {
    await pauseCampaign(metaAccessToken, metaCampaignId);
    return NextResponse.json({ ok: true, action: "pause" });
  }
  if (body.action === "activate") {
    await activateCampaign(metaAccessToken, metaCampaignId);
    return NextResponse.json({ ok: true, action: "activate" });
  }

  const minor = Math.round(body.dailyBudgetBrl * 100);
  await updateCampaignDailyBudget(metaAccessToken, metaCampaignId, minor);
  return NextResponse.json({ ok: true, action: "update_budget", dailyBudgetBrl: body.dailyBudgetBrl });
}
