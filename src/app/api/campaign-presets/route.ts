import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const VALID_PRESETS = ["default", "lead_whatsapp", "lead_site", "sales", "reach"] as const;

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
  preset: z.enum(VALID_PRESETS)
});

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));
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
