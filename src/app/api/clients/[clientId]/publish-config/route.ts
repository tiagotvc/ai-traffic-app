import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getMetaPublishConfigForClient } from "@/lib/client-publish-config";
import { fetchUserPages } from "@/lib/meta-graph";

const BodySchema = z.object({
  metaPageId: z.string().nullable().optional(),
  metaLinkUrl: z.string().nullable().optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant, metaAccessToken } = await getAppContext();

  const config = await getMetaPublishConfigForClient(tenant.id, clientId);
  if (!config) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  let pages: Array<{ id: string; name: string }> = [];
  if (metaAccessToken) {
    try {
      const list = await fetchUserPages(metaAccessToken);
      pages = list.map((p) => ({ id: p.id, name: p.name ?? p.id }));
    } catch {
      pages = [];
    }
  }

  return NextResponse.json({
    ok: true,
    ...config,
    availablePages: pages,
    envFallback: {
      metaPageId: process.env.META_PAGE_ID?.trim() || null,
      metaLinkUrl: process.env.META_LINK_URL?.trim() || null
    }
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const { client: clientRepo } = await repositories();

  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.metaPageId !== undefined) {
    client.metaPageId = body.metaPageId?.trim() || null;
  }
  if (body.metaLinkUrl !== undefined) {
    const raw = body.metaLinkUrl;
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (trimmed) {
      try {
        new URL(trimmed);
      } catch {
        return NextResponse.json({ ok: false, error: "URL de destino inválida" }, { status: 400 });
      }
      client.metaLinkUrl = trimmed;
    } else {
      client.metaLinkUrl = null;
    }
  }

  await clientRepo.save(client);

  const config = await getMetaPublishConfigForClient(tenant.id, client.id);
  return NextResponse.json({ ok: true, ...config });
}
