import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { executeActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ clientId: string; suggestionId: string }> }
) {
  try {
    const { clientId, suggestionId } = await params;
    const { tenant, user } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const suggestion = await executeActionSuggestion(
      tenant.id,
      client.id,
      suggestionId,
      user?.id
    );
    if (!suggestion) {
      return NextResponse.json({ ok: false, error: "Sugestão não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, suggestion });
  } catch (err) {
    console.error("[action-suggestion execute]", err);
    return NextResponse.json({ ok: false, error: "Erro ao executar sugestão" }, { status: 500 });
  }
}
