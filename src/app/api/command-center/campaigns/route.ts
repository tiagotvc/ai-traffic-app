import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";

export async function GET(req: Request) {
  const { tenant, user } = await getAppContext();
  const url = new URL(req.url);

  const clientIds = await listClientIdsForUser(tenant.id, user.id);

  const result = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    q: url.searchParams.get("q") ?? undefined,
    onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
    tag: url.searchParams.get("tag") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? "100"),
    offset: Number(url.searchParams.get("offset") ?? "0")
  });

  return NextResponse.json({ ok: true, ...result });
}
