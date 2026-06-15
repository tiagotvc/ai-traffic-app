import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getBrainSummary } from "@/lib/agency-brain/brain-summary-service";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const url = new URL(req.url);
    const includeContext = url.searchParams.get("context") === "1";

    const summary = await getBrainSummary(tenant.id, client.id);
    const context = includeContext
      ? await getClientBrainContext(tenant.id, client.id)
      : undefined;

    return NextResponse.json({ ok: true, summary, context });
  } catch (err) {
    console.error("[brain-summary GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar resumo" }, { status: 500 });
  }
}
