import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  activateAdSet,
  pauseAdSet,
  updateAdSetDailyBudget
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
  { params }: { params: Promise<{ metaAdsetId: string }> }
) {
  const { metaAdsetId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.action === "pause") {
    await pauseAdSet(metaAccessToken, metaAdsetId);
    return NextResponse.json({ ok: true, action: "pause" });
  }
  if (body.action === "activate") {
    await activateAdSet(metaAccessToken, metaAdsetId);
    return NextResponse.json({ ok: true, action: "activate" });
  }

  const minor = Math.round(body.dailyBudgetBrl * 100);
  await updateAdSetDailyBudget(metaAccessToken, metaAdsetId, minor);
  return NextResponse.json({ ok: true, action: "update_budget", dailyBudgetBrl: body.dailyBudgetBrl });
}
