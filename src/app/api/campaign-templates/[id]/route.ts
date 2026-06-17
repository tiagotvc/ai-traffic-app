import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { CampaignDraftPayloadSchema } from "@/lib/campaign-draft";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  payload: CampaignDraftPayloadSchema.optional()
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { tenant } = await getAppContext();
  const { id } = await ctx.params;
  const { campaignTemplate: repo } = await repositories();
  const template = await repo.findOne({ where: { id, tenantId: tenant.id } });
  if (!template) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, template });
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { tenant } = await getAppContext();
  const { id } = await ctx.params;
  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const { campaignTemplate: repo } = await repositories();
  const template = await repo.findOne({ where: { id, tenantId: tenant.id } });
  if (!template) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (body.name !== undefined) template.name = body.name;
  if (body.payload !== undefined) template.payload = body.payload;
  await repo.save(template);
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { tenant } = await getAppContext();
  const { id } = await ctx.params;
  const { campaignTemplate: repo } = await repositories();
  const template = await repo.findOne({ where: { id, tenantId: tenant.id } });
  if (!template) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  await repo.delete({ id, tenantId: tenant.id });
  return NextResponse.json({ ok: true });
}
