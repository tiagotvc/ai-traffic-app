import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { uploadAdImage } from "@/lib/meta-graph";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  imageUrl: z.string().url(),
  label: z.string().min(1)
});

export async function GET(req: Request) {
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
  }
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { creativeAsset: repo } = await repositories();
  const assets = await repo.find({
    where: { clientId: client.id },
    order: { createdAt: "DESC" }
  });
  return NextResponse.json({ ok: true, assets });
}

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const uploaded = await uploadAdImage(metaAccessToken, body.adAccountId, body.imageUrl, body.label);
  const hash = Object.values(uploaded.images ?? {})[0]?.hash;

  const { creativeAsset: repo } = await repositories();
  const asset = await repo.save(
    repo.create({
      clientId: client.id,
      metaAdAccountId: body.adAccountId,
      metaImageHash: hash ?? null,
      label: body.label
    })
  );

  return NextResponse.json({ ok: true, asset, hash });
}
