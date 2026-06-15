import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { runActionSuggestionsForClient } from "@/lib/action-suggestions/action-suggestion-generator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const result = await runActionSuggestionsForClient(tenant.id, client.id, clientId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[action-suggestions generate]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar sugestões" }, { status: 500 });
  }
}
