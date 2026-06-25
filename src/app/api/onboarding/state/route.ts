import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { tenantHasRealClients } from "@/lib/onboarding-state";

export async function GET() {
  try {
    const { tenant } = await getAppContext();
    const hasRealClients = await tenantHasRealClients(tenant.id);
    return NextResponse.json({ ok: true, hasRealClients });
  } catch {
    return NextResponse.json({ ok: false, hasRealClients: true }, { status: 401 });
  }
}
