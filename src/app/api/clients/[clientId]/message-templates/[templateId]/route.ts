import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

const PatchSchema = z.object({
  channel: z.enum(["whatsapp", "messenger", "instagram"]).optional(),
  name: z.string().min(1).optional(),
  greeting: z.string().optional(),
  icebreakers: z.array(z.string()).optional()
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ clientId: string; templateId: string }> }
) {
  const { tenant } = await getAppContext();
  const { clientId, templateId } = await ctx.params;
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const { messageTemplate: repo } = await repositories();
  const template = await repo.findOne({ where: { id: templateId, clientId: client.id } });
  if (!template) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  Object.assign(template, body);
  await repo.save(template);
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ clientId: string; templateId: string }> }
) {
  const { tenant } = await getAppContext();
  const { clientId, templateId } = await ctx.params;
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { messageTemplate: repo } = await repositories();
  await repo.delete({ id: templateId, clientId: client.id });
  return NextResponse.json({ ok: true });
}
