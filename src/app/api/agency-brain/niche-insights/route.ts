import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getNicheStarterInsights } from "@/lib/agency-brain/niche-insights";

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const url = new URL(req.url);
    const clientSlug = url.searchParams.get("client");
    if (!clientSlug) {
      return NextResponse.json({ ok: false, error: "Cliente obrigatório" }, { status: 400 });
    }

    const client = await getClientBySlugOrId(tenant.id, clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const insights = await getNicheStarterInsights(client.niche);
    return NextResponse.json({ ok: true, ...insights });
  } catch (err) {
    console.error("[niche-insights]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar insights de nicho" }, { status: 500 });
  }
}
