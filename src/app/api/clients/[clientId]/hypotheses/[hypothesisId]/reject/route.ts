import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { rejectHypothesis } from "@/lib/agency-brain/hypothesis-service";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ clientId: string; hypothesisId: string }> }
) {
  try {
    const { clientId, hypothesisId } = await params;
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

    const hypothesis = await rejectHypothesis(tenant.id, client.id, hypothesisId);
    if (!hypothesis) {
      return NextResponse.json({ ok: false, error: "Hipótese não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, hypothesis });
  } catch (err) {
    console.error("[hypothesis reject]", err);
    return NextResponse.json({ ok: false, error: "Erro ao rejeitar hipótese" }, { status: 500 });
  }
}
