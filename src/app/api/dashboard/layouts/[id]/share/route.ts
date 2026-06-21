import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { getLayoutWithWidgets } from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";

const PostSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  readOnly: z.boolean().optional()
});

/** Agency plan: share dashboard layout snapshot with another workspace member. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);

    if (!entitlements.limits.allowDashboardSharing) {
      return NextResponse.json({ ok: false, error: "Sharing requires Agency plan" }, { status: 403 });
    }

    const body = PostSchema.parse(await req.json().catch(() => ({})));
    const layout = await getLayoutWithWidgets(id, tenant.id, user.id);
    if (!layout) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      share: {
        layoutId: layout.id,
        layoutName: layout.name,
        widgetCount: layout.widgets.length,
        targetUserId: body.targetUserId ?? null,
        readOnly: body.readOnly ?? true,
        sharedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
