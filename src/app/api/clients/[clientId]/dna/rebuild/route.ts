import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { rebuildClientDna } from "@/lib/agency-brain/dna-builder";

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
      await assertLimit(tenant.id, "allowAgencyBrainDna");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const dna = await rebuildClientDna(tenant.id, client.id);
    return NextResponse.json({ ok: true, dna });
  } catch (err) {
    console.error("[dna rebuild]", err);
    return NextResponse.json({ ok: false, error: "Erro ao reconstruir DNA" }, { status: 500 });
  }
}
