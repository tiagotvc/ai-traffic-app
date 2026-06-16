import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  getActionSuggestionSummary,
  listActionSuggestions
} from "@/lib/action-suggestions/action-suggestion-service";
import { ListActionSuggestionsQuerySchema } from "@/lib/agency-brain/schemas";

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
    const query = ListActionSuggestionsQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      actionType: url.searchParams.get("actionType") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortDir: url.searchParams.get("sortDir") ?? undefined
    });

    const [list, summary] = await Promise.all([
      listActionSuggestions(tenant.id, client.id, query),
      getActionSuggestionSummary(tenant.id, client.id)
    ]);

    return NextResponse.json({ ok: true, ...list, summary });
  } catch (err) {
    console.error("[action-suggestions list]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar sugestões" }, { status: 500 });
  }
}
