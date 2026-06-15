import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { acknowledgeActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; suggestionId: string }> }
) {
  try {
    const { clientId, suggestionId } = await params;
    const { tenant, user } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    let note: string | undefined;
    try {
      const body = (await req.json()) as { note?: string };
      note = body.note;
    } catch {
      // optional body
    }

    const suggestion = await acknowledgeActionSuggestion(
      tenant.id,
      client.id,
      suggestionId,
      user?.id,
      note
    );
    if (!suggestion) {
      return NextResponse.json({ ok: false, error: "Sugestão não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, suggestion });
  } catch (err) {
    console.error("[action-suggestion acknowledge]", err);
    return NextResponse.json({ ok: false, error: "Erro ao registrar sugestão" }, { status: 500 });
  }
}
