import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { ListTimelineQuerySchema } from "@/lib/agency-brain/schemas";
import { listClientTimeline } from "@/lib/agency-brain/timeline-service";

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
      await assertLimit(tenant.id, "allowAgencyBrainTimeline");
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const url = new URL(req.url);
    const query = ListTimelineQuerySchema.parse({
      type: url.searchParams.get("type") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    });

    const result = await listClientTimeline(tenant.id, client.id, query);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[timeline GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar timeline" }, { status: 500 });
  }
}
