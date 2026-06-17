import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { CampaignDraftPayloadSchema } from "@/lib/campaign-draft";

const BodySchema = z.object({
  name: z.string().min(1),
  clientId: z.string().nullable().optional(),
  payload: CampaignDraftPayloadSchema
});

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const clientId = new URL(req.url).searchParams.get("clientId");
  const { campaignTemplate: repo } = await repositories();

  let templates = await repo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" }
  });
  if (clientId) {
    templates = templates.filter((t) => !t.clientId || t.clientId === clientId);
  }

  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { campaignTemplate: repo } = await repositories();

  const template = await repo.save(
    repo.create({
      tenantId: tenant.id,
      clientId: body.clientId ?? null,
      name: body.name,
      payload: body.payload
    })
  );

  return NextResponse.json({ ok: true, template });
}
