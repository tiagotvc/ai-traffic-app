import { NextResponse } from "next/server";

import type { PeriodState } from "@/components/PeriodFilter";
import { getAppContext } from "@/lib/app-context";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";
import { resolveAlertCardData } from "@/lib/dashboard/alert-card-data-service";
import { resolveWidgetData } from "@/lib/dashboard/widget-data-resolvers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const { tenant, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);

    const def = getWidgetDefinition(decodeURIComponent(type));
    if (!def) return NextResponse.json({ ok: false, error: "Unknown widget" }, { status: 404 });

    const url = new URL(req.url);
    const period: PeriodState = {
      preset: (url.searchParams.get("preset") as PeriodState["preset"]) || "last30",
      since: url.searchParams.get("since") ?? "",
      until: url.searchParams.get("until") ?? ""
    };

    const configRaw = url.searchParams.get("config");
    let config: Record<string, unknown> | undefined;
    if (configRaw) {
      try {
        config = JSON.parse(decodeURIComponent(configRaw)) as Record<string, unknown>;
      } catch {
        config = undefined;
      }
    }

    if (def.type === "alerts.card" && config) {
      const data = await resolveAlertCardData(config, {
        tenantId: tenant.id,
        clientFilter: url.searchParams.get("clientId") ?? undefined,
        accountFilter: url.searchParams.get("accountId") ?? undefined,
        period,
        tz: url.searchParams.get("tz") ?? undefined
      });
      return NextResponse.json({ ok: true, data });
    }

    const data = await resolveWidgetData(def.dataSource, {
      tenantId: tenant.id,
      clientFilter: url.searchParams.get("clientId") ?? undefined,
      accountFilter: url.searchParams.get("accountId") ?? undefined,
      period,
      tz: url.searchParams.get("tz") ?? undefined
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    console.error("[dashboard/widgets/data GET]", err);
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
