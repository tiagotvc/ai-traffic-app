import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { getClientDna, patchClientDna } from "@/lib/agency-brain/dna-builder";
import { PatchClientDnaSchema } from "@/lib/agency-brain/schemas";

export async function GET(
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

    const dna = await getClientDna(tenant.id, client.id);
    return NextResponse.json({ ok: true, dna });
  } catch (err) {
    console.error("[dna GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar DNA" }, { status: 500 });
  }
}

export async function PATCH(
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

    try {
      await assertLimit(tenant.id, "allowAgencyBrainDna");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const body = PatchClientDnaSchema.parse(await req.json());
    const dna = await patchClientDna(tenant.id, client.id, body);
    return NextResponse.json({ ok: true, dna });
  } catch (err) {
    console.error("[dna PATCH]", err);
    return NextResponse.json({ ok: false, error: "Erro ao atualizar DNA" }, { status: 400 });
  }
}
