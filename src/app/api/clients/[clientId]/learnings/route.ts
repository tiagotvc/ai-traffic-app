import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  createManualLearning,
  listClientLearnings
} from "@/lib/agency-brain/client-learning-service";
import { CreateLearningSchema, ListLearningsQuerySchema } from "@/lib/agency-brain/schemas";

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
    const query = ListLearningsQuerySchema.parse({
      category: url.searchParams.get("category") ?? undefined,
      impact: url.searchParams.get("impact") ?? undefined,
      confidence: url.searchParams.get("confidence") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      tags: url.searchParams.get("tags") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortDir: url.searchParams.get("sortDir") ?? undefined
    });

    const tags = query.tags ? query.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const result = await listClientLearnings(tenant.id, client.id, {
      ...query,
      tags
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[learnings GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar aprendizados" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant, user } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = CreateLearningSchema.parse(await req.json());
    const learning = await createManualLearning(tenant.id, client.id, body, user?.id);

    return NextResponse.json({ ok: true, learning });
  } catch (err) {
    console.error("[learnings POST]", err);
    return NextResponse.json({ ok: false, error: "Erro ao criar aprendizado" }, { status: 400 });
  }
}
