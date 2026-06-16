import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit, PlanLimitError } from "@/lib/billing/entitlements";
import {
  createManualHypothesis,
  listHypotheses
} from "@/lib/agency-brain/hypothesis-service";
import { CreateHypothesisSchema, ListHypothesesQuerySchema } from "@/lib/agency-brain/schemas";

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

    try {
      await assertLimit(tenant.id, "allowAgencyBrainHypotheses");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const url = new URL(req.url);
    const query = ListHypothesesQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    });

    const result = await listHypotheses(tenant.id, client.id, query);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[hypotheses GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar hipóteses" }, { status: 500 });
  }
}

export async function POST(
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
      await assertLimit(tenant.id, "allowAgencyBrainHypotheses");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const body = CreateHypothesisSchema.parse(await req.json());
    const hypothesis = await createManualHypothesis(tenant.id, client.id, body);
    return NextResponse.json({ ok: true, hypothesis });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      const res = billingErrorResponse(err);
      if (res) return res;
    }
    console.error("[hypotheses POST]", err);
    return NextResponse.json({ ok: false, error: "Erro ao criar hipótese" }, { status: 400 });
  }
}
