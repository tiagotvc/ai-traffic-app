import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listAgencyLearnings } from "@/lib/agency-brain/agency-learnings-service";
import { ListLearningsQuerySchema } from "@/lib/agency-brain/schemas";

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const url = new URL(req.url);
    const query = ListLearningsQuerySchema.parse({
      category: url.searchParams.get("category") ?? undefined,
      impact: url.searchParams.get("impact") ?? undefined,
      confidence: url.searchParams.get("confidence") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      tags: url.searchParams.get("tags") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortDir: url.searchParams.get("sortDir") ?? undefined
    });

    const viewParam = url.searchParams.get("view");
    const view =
      viewParam === "shelf" || viewParam === "library" ? viewParam : undefined;

    const tags = query.tags ? query.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const result = await listAgencyLearnings(tenant.id, { ...query, tags, view });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[agency-learnings GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar aprendizados da agência" }, { status: 500 });
  }
}
