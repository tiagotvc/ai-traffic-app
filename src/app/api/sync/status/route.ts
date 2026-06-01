import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantSyncStatus } from "@/lib/sync-status";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const clientId = new URL(req.url).searchParams.get("clientId");
  const status = await getTenantSyncStatus(tenant.id, clientId);
  return NextResponse.json({ ok: true, ...status });
}
