import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

const BodySchema = z.object({
  channel: z.enum(["whatsapp", "messenger", "instagram"]),
  name: z.string().min(1),
  greeting: z.string().default(""),
  icebreakers: z.array(z.string()).default([])
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  const { tenant } = await getAppContext();
  const { clientId } = await ctx.params;
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { messageTemplate: repo } = await repositories();
  const templates = await repo.find({
    where: { clientId: client.id },
    order: { updatedAt: "DESC" }
  });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  const { tenant } = await getAppContext();
  const { clientId } = await ctx.params;
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { messageTemplate: repo } = await repositories();
  const template = await repo.save(
    repo.create({
      clientId: client.id,
      channel: body.channel,
      name: body.name,
      greeting: body.greeting,
      icebreakers: body.icebreakers
    })
  );
  return NextResponse.json({ ok: true, template });
}
