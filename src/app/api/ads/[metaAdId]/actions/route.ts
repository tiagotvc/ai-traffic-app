import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { activateAd, pauseAd } from "@/lib/meta-graph";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("activate") })
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ metaAdId: string }> }
) {
  const { metaAdId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.action === "pause") {
    await pauseAd(metaAccessToken, metaAdId);
    return NextResponse.json({ ok: true, action: "pause" });
  }
  await activateAd(metaAccessToken, metaAdId);
  return NextResponse.json({ ok: true, action: "activate" });
}
