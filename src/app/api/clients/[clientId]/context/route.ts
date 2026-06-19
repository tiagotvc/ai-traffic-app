import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

const CompetitorSchema = z.object({
  name: z.string().min(1).max(120),
  pageId: z.string().max(64).optional(),
  pageUrl: z.string().max(500).optional()
});

const BodySchema = z.object({
  aiContext: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  niche: z
    .enum([
      "clinica",
      "ecommerce",
      "infoproduto",
      "imobiliaria",
      "saas",
      "apps_games",
      "outro"
    ])
    .nullable()
    .optional(),
  marketCountry: z.string().min(2).max(8).optional(),
  competitors: z.array(CompetitorSchema).optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    aiContext: client.aiContext,
    niche: client.niche ?? null,
    marketCountry: client.marketCountry ?? "BR",
    competitors: Array.isArray(client.competitors) ? client.competitors : []
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const { client: clientRepo } = await repositories();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  if (body.aiContext !== undefined) {
    if (typeof body.aiContext === "string") {
      try {
        client.aiContext = JSON.parse(body.aiContext);
      } catch {
        client.aiContext = { notes: body.aiContext };
      }
    } else {
      client.aiContext = body.aiContext;
    }
  }

  if (body.niche !== undefined) {
    client.niche = body.niche;
  }

  if (body.marketCountry !== undefined) {
    client.marketCountry = body.marketCountry.trim().toUpperCase();
  }

  if (body.competitors !== undefined) {
    client.competitors = body.competitors;
  }

  await clientRepo.save(client);

  return NextResponse.json({
    ok: true,
    aiContext: client.aiContext,
    niche: client.niche,
    marketCountry: client.marketCountry ?? "BR",
    competitors: client.competitors ?? []
  });
}
