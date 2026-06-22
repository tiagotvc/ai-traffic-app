import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { applyTemplateToLayout } from "@/lib/dashboard/dashboard-canvas-service";
import { DashboardCanvasForbiddenError } from "@/lib/dashboard/dashboard-widget-permissions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { templateId?: string };
    if (!body.templateId) {
      return NextResponse.json({ ok: false, error: "templateId required" }, { status: 400 });
    }

    const { tenant, user, entitlements } = await getAppContext();
    const layout = await applyTemplateToLayout(
      id,
      body.templateId,
      tenant.id,
      user.id,
      entitlements
    );
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao aplicar template" },
      { status: 400 }
    );
  }
}
