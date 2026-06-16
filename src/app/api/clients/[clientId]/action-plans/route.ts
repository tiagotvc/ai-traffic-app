import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import {
  createActionPlanFromSuggestions,
  createManualActionPlan,
  listActionPlans
} from "@/lib/agency-brain/action-plan-service";
import { CreateActionPlanSchema } from "@/lib/agency-brain/schemas";

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
      await assertLimit(tenant.id, "allowAgencyBrainActionPlans");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");

    const result = await listActionPlans(tenant.id, client.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[action-plans GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar planos de ação" }, { status: 500 });
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
      await assertLimit(tenant.id, "allowAgencyBrainActionPlans");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const body = CreateActionPlanSchema.parse(await req.json());

    const plan =
      body.items?.length && body.title
        ? await createManualActionPlan(tenant.id, client.id, body.title, body.items)
        : await createActionPlanFromSuggestions(tenant.id, client.id, {
            title: body.title,
            suggestionIds: body.suggestionIds
          });

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("[action-plans POST]", err);
    return NextResponse.json({ ok: false, error: "Erro ao criar plano de ação" }, { status: 400 });
  }
}
