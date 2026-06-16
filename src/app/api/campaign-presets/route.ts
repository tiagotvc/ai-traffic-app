import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { validatePresetKey } from "@/lib/campaign-type-store";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";

const BUILTIN = [...CAMPAIGN_PRESETS] as const;

export async function GET() {
  const { tenant } = await getAppContext();
  const { campaignPreset: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId: tenant.id } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.metaCampaignId] = r.preset;
  return NextResponse.json({ ok: true, presets: map });
}

const BodySchema = z.object({
  metaCampaignId: z.string().min(1),
  preset: z.string().min(1)
});

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const valid =
    (BUILTIN as readonly string[]).includes(body.preset) ||
    (await validatePresetKey(tenant.id, user.id, body.preset));
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_preset" }, { status: 400 });
  }

  const { campaignPreset: repo } = await repositories();
  let row = await repo.findOne({
    where: { tenantId: tenant.id, metaCampaignId: body.metaCampaignId }
  });
  if (row) {
    row.preset = body.preset;
  } else {
    row = repo.create({
      tenantId: tenant.id,
      metaCampaignId: body.metaCampaignId,
      preset: body.preset
    });
  }
  await repo.save(row);
  return NextResponse.json({ ok: true });
}
