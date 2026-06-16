import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantHistoricalBackfillStatus } from "@/lib/historical-backfill";

export async function GET() {
  const { tenant } = await getAppContext();
  const status = await getTenantHistoricalBackfillStatus(tenant.id);
  return NextResponse.json(status);
}

