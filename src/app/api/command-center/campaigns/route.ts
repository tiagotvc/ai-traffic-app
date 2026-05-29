import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";

function parseDays(raw: string | null) {
  const n = Number(raw ?? "7");
  return Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 7;
}

export async function GET(req: Request) {
  const { tenant, user } = await getAppContext();
  const url = new URL(req.url);

  const userClientIds = await listClientIdsForUser(tenant.id, user.id);
  const clientParam = url.searchParams.get("clientId");
  let clientIds = userClientIds;

  if (clientParam) {
    const client = await getClientBySlugOrId(tenant.id, clientParam);
    if (!client) {
      return NextResponse.json({ ok: true, rows: [], total: 0 });
    }
    if (userClientIds?.length && !userClientIds.includes(client.id)) {
      return NextResponse.json({ ok: true, rows: [], total: 0 });
    }
    clientIds = [client.id];
  }

  const result = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    q: url.searchParams.get("q") ?? undefined,
    onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
    tag: url.searchParams.get("tag") ?? undefined,
    days: parseDays(url.searchParams.get("days")),
    limit: Number(url.searchParams.get("limit") ?? "100"),
    offset: Number(url.searchParams.get("offset") ?? "0")
  });

  return NextResponse.json({ ok: true, ...result });
}
