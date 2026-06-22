import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  ensureSystemDashboardTemplates,
  getActiveDashboardAddons,
  listDashboardTemplates
} from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

export async function GET() {
  try {
    const { tenant, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    try {
      await ensureSystemDashboardTemplates();
    } catch (seedErr) {
      console.error("[dashboard/templates] seed failed:", seedErr);
    }
    const templates = await listDashboardTemplates(tenant.id);
    return NextResponse.json({
      ok: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        minPlanSlug: t.minPlanSlug,
        widgets: t.widgets ?? []
      }))
    });
  } catch (err) {
    console.error("[dashboard/templates] GET failed:", err);
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro" },
      { status: 500 }
    );
  }
}
