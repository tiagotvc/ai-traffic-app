import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { promoteHypothesisToLearning } from "@/lib/agency-brain/hypothesis-service";

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

    const result = await promoteHypothesisToLearning(tenant.id, client.id, hypothesisId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Hipótese não encontrada ou já processada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[hypothesis promote]", err);
    return NextResponse.json({ ok: false, error: "Erro ao promover hipótese" }, { status: 500 });
  }
}
