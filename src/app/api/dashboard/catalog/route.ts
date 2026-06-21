import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getActiveDashboardAddons } from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError,
  isWidgetAllowedForPlan
} from "@/lib/dashboard/dashboard-widget-permissions";
import { WIDGET_CATALOG, WIDGET_CATEGORY_ORDER } from "@/lib/dashboard/widget-catalog";

export async function GET() {
  try {
    const { tenant, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const addons = await getActiveDashboardAddons(tenant.id);

    const widgets = WIDGET_CATALOG.map((w) => ({
      ...w,
      allowed: isWidgetAllowedForPlan(entitlements, w.type, addons)
    }));

    return NextResponse.json({
      ok: true,
      categories: WIDGET_CATEGORY_ORDER,
      widgets,
      limits: {
        maxDashboards: entitlements.limits.maxDashboards,
        maxDashboardWidgets: entitlements.limits.maxDashboardWidgets,
        allowResize: entitlements.limits.allowDashboardResize,
        allowAiBuilder: entitlements.limits.allowDashboardAiBuilder
      }
    });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
