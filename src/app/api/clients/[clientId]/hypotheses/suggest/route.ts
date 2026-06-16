import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { runHypothesisSuggestionsForClient } from "@/lib/agency-brain/hypothesis-service";

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

    try {
      await assertLimit(tenant.id, "allowAgencyBrainHypotheses");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const result = await runHypothesisSuggestionsForClient(tenant.id, client.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[hypotheses suggest]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar hipóteses" }, { status: 500 });
  }
}
