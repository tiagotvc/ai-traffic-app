import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  getActiveDashboardAddons,
  listDashboardTemplates,
  seedSystemTemplatesIfEmpty
} from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

export async function GET() {
  try {
    const { tenant, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    await seedSystemTemplatesIfEmpty();
    const templates = await listDashboardTemplates(tenant.id);
    return NextResponse.json({ ok: true, templates });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
