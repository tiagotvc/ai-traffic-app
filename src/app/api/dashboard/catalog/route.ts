import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getEffectiveDashboardAddons } from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError,
  isWidgetAllowedForPlan
} from "@/lib/dashboard/dashboard-widget-permissions";
import { MASTER_BLASTER_ADDON } from "@/lib/dashboard/master-blaster";
import { WIDGET_CATALOG, WIDGET_CATEGORY_ORDER } from "@/lib/dashboard/widget-catalog";

export async function GET() {
  try {
    const { tenant, entitlements, platformAdmin } = await getAppContext();
    assertDashboardCanvas(entitlements, { platformAdmin });
    const addons = await getEffectiveDashboardAddons(tenant.id, platformAdmin);

    const widgets = WIDGET_CATALOG.map((w) => ({
      type: w.type,
      titleKey: w.titleKey,
      category: w.category,
      allowed: isWidgetAllowedForPlan(entitlements, w.type, addons, { platformAdmin }),
      comingSoon: w.comingSoon ?? false,
      isAiWidget: w.isAiWidget ?? false,
      minPlan: w.minPlan,
      requiredAddon: w.requiredAddon,
      isMasterBlaster: w.requiredAddon === MASTER_BLASTER_ADDON
    }));

    return NextResponse.json({
      ok: true,
      isPlatformAdmin: platformAdmin,
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
