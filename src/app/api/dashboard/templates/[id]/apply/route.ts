import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { createDashboardLayout } from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";
import { repositories } from "@/db/repositories";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const { dashboardTemplate: repo } = await repositories();
    const template = await repo.findOne({ where: { id } });
    if (!template) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const layout = await createDashboardLayout(tenant.id, user.id, entitlements, {
      name: template.name,
      templateId: template.id
    });
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 400 });
  }
}
