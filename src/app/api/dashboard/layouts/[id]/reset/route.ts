import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resetDashboardLayoutToDefault } from "@/lib/dashboard/dashboard-canvas-service";
import { DashboardCanvasForbiddenError } from "@/lib/dashboard/dashboard-widget-permissions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    const layout = await resetDashboardLayoutToDefault(id, tenant.id, user.id, entitlements);
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao restaurar layout" },
      { status: 400 }
    );
  }
}
