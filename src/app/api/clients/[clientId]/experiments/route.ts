import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { createExperiment, listExperiments } from "@/lib/agency-brain/experiment-service";
import { CreateExperimentSchema, ListExperimentsQuerySchema } from "@/lib/agency-brain/schemas";

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
      await assertLimit(tenant.id, "allowAgencyBrainExperiments");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const url = new URL(req.url);
    const query = ListExperimentsQuerySchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    });

    const result = await listExperiments(tenant.id, client.id, query);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[experiments GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar experimentos" }, { status: 500 });
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
      await assertLimit(tenant.id, "allowAgencyBrainExperiments");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const body = CreateExperimentSchema.parse(await req.json());
    const experiment = await createExperiment(tenant.id, client.id, body);
    return NextResponse.json({ ok: true, experiment });
  } catch (err) {
    console.error("[experiments POST]", err);
    return NextResponse.json({ ok: false, error: "Erro ao criar experimento" }, { status: 400 });
  }
}
