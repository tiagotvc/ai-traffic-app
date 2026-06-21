import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  createDashboardLayout,
  listDashboardLayouts,
  seedSystemTemplatesIfEmpty,
  seedWidgetPermissionsIfEmpty
} from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

const PostSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().optional(),
  templateId: z.string().uuid().optional()
});

export async function GET() {
  try {
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    await Promise.all([seedWidgetPermissionsIfEmpty(), seedSystemTemplatesIfEmpty()]);
    const layouts = await listDashboardLayouts(tenant.id, user.id, entitlements);
    return NextResponse.json({ ok: true, layouts });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    console.error("[dashboard/layouts GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar dashboards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    const body = PostSchema.parse(await req.json().catch(() => ({})));
    const layout = await createDashboardLayout(tenant.id, user.id, entitlements, body);
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    console.error("[dashboard/layouts POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao criar dashboard" },
      { status: 400 }
    );
  }
}
