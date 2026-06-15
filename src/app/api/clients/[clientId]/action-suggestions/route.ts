import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  getActionSuggestionSummary,
  listActionSuggestions
} from "@/lib/action-suggestions/action-suggestion-service";

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
    const status = url.searchParams.get("status") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    const [list, summary] = await Promise.all([
      listActionSuggestions(tenant.id, client.id, {
        status: status as never,
        page,
        pageSize
      }),
      getActionSuggestionSummary(tenant.id, client.id)
    ]);

    return NextResponse.json({ ok: true, ...list, summary });
  } catch (err) {
    console.error("[action-suggestions list]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar sugestões" }, { status: 500 });
  }
}
