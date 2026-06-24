import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import {
  deleteDashboardLayout,
  getLayoutWithWidgets,
  setDashboardLayoutPublished
} from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  subtitle: z.string().max(240).nullable().optional(),
  isDefault: z.boolean().optional(),
  published: z.boolean().optional()
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
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const body = PatchSchema.parse(await req.json().catch(() => ({})));
    const { dashboardLayout: repo } = await repositories();
    const layout = await repo.findOne({ where: { id, tenantId: tenant.id, userId: user.id } });
    if (!layout) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (body.name) layout.name = body.name;
    if (body.subtitle !== undefined) {
      layout.subtitle = body.subtitle?.trim() ? body.subtitle.trim() : null;
    }
    if (body.isDefault) {
      await repo.update({ tenantId: tenant.id, userId: user.id }, { isDefault: false });
      layout.isDefault = true;
    }
    if (body.published !== undefined) {
      const out = await setDashboardLayoutPublished(id, tenant.id, user.id, body.published);
      return NextResponse.json({ ok: true, layout: out });
    }
    await repo.save(layout);
    const out = await getLayoutWithWidgets(id, tenant.id, user.id);
    return NextResponse.json({ ok: true, layout: out });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const layouts = await deleteDashboardLayout(tenant.id, user.id, entitlements, id);
    return NextResponse.json({ ok: true, layouts });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Layout not found") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
