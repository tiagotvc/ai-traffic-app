import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { listDashboardBrainShelf } from "@/lib/agency-brain/dashboard-shelf-service";

const QuerySchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(20).optional().default(8)
});

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const url = new URL(req.url);
    const { pageSize } = QuerySchema.parse({
      pageSize: url.searchParams.get("pageSize") ?? undefined
    });

    const items = await listDashboardBrainShelf(tenant.id, pageSize);
    return NextResponse.json({ ok: true, items, total: items.length });
  } catch (err) {
    console.error("[dashboard/brain-shelf GET]", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao listar aprendizados do dashboard" },
      { status: 500 }
    );
  }
}
