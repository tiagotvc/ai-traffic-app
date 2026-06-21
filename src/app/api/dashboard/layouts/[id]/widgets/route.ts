import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  getActiveDashboardAddons,
  getLayoutWithWidgets,
  saveLayoutWidgets
} from "@/lib/dashboard/dashboard-canvas-service";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import {
  assertDashboardCanvas,
  assertDashboardWidget,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

const WidgetSchema = z.object({
  id: z.string(),
  layoutId: z.string(),
  widgetType: z.string(),
  title: z.string().nullable(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  size: z.enum(["xs", "sm", "md", "lg", "xl"]),
  visible: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int()
});

const PutSchema = z.object({
  widgets: z.array(WidgetSchema)
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const layout = await getLayoutWithWidgets(id, tenant.id, user.id);
    if (!layout) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, widgets: layout.widgets });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const body = PutSchema.parse(await req.json().catch(() => ({})));
    const addons = await getActiveDashboardAddons(tenant.id);

    for (const w of body.widgets) {
      assertDashboardWidget(entitlements, w.widgetType, addons);
    }

    const layout = await saveLayoutWidgets(
      id,
      tenant.id,
      user.id,
      entitlements,
      body.widgets as WidgetInstanceDto[]
    );
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao salvar widgets" },
      { status: 400 }
    );
  }
}
