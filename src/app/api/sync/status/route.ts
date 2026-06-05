import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getMetaConnectionInfo } from "@/lib/meta-auth-store";
import { canManualSync } from "@/lib/sync-queue";
import { getTenantSyncStatus } from "@/lib/sync-status";

export async function GET(req: Request) {
  const { tenant, user } = await getAppContext();
  const clientId = new URL(req.url).searchParams.get("clientId");
  const status = await getTenantSyncStatus(tenant.id, clientId);
  const metaConnection = await getMetaConnectionInfo(tenant.id, user.id);
  const cooldown = await canManualSync(tenant.id);
  return NextResponse.json({
    ok: true,
    ...status,
    metaConnection,
    manualSyncCooldown: cooldown.ok ? null : { retryAfterSec: cooldown.retryAfterSec ?? 0 }
  });
}
