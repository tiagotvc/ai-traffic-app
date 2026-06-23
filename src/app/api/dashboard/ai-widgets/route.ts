import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import {
  getEffectiveDashboardAddons,
  saveLayoutWidgets
} from "@/lib/dashboard/dashboard-canvas-service";
import {
  AI_BUILDER_MIN_PROMPT_LENGTH,
  inferWidgetFromPrompt
} from "@/lib/dashboard/ai-widget-inference";
import {
  assertDashboardCanvas,
  assertDashboardWidget,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

const PostSchema = z.object({
  layoutId: z.string().uuid(),
  prompt: z.string().min(AI_BUILDER_MIN_PROMPT_LENGTH).max(2000)
});

export async function GET() {
  try {
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    if (!entitlements.limits.allowDashboardAiBuilder) {
      return NextResponse.json({ ok: false, error: "AI builder not available" }, { status: 403 });
    }
    const { dashboardAiWidget: repo } = await repositories();
    const rows = await repo.find({
      where: { tenantId: tenant.id, userId: user.id },
      order: { createdAt: "DESC" },
      take: 50
    });
    return NextResponse.json({ ok: true, widgets: rows });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenant, user, entitlements, platformAdmin } = await getAppContext();
    assertDashboardCanvas(entitlements);
    if (!entitlements.limits.allowDashboardAiBuilder) {
      return NextResponse.json({ ok: false, error: "AI builder not available" }, { status: 403 });
    }

    const body = PostSchema.parse(await req.json().catch(() => ({})));
    const inferred = inferWidgetFromPrompt(body.prompt);
    if (!inferred) {
      return NextResponse.json({ ok: false, error: "Could not infer widget" }, { status: 400 });
    }

    const def = getWidgetDefinition(inferred.widgetType);
    if (!def) {
      return NextResponse.json({ ok: false, error: "Could not infer widget" }, { status: 400 });
    }

    const addons = await getEffectiveDashboardAddons(tenant.id, platformAdmin);
    assertDashboardWidget(entitlements, inferred.widgetType, addons, { platformAdmin });

    const { dashboardAiWidget: aiRepo, dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
      await repositories();

    const layout = await layoutRepo.findOne({
      where: { id: body.layoutId, tenantId: tenant.id, userId: user.id }
    });
    if (!layout) return NextResponse.json({ ok: false, error: "Layout not found" }, { status: 404 });

    const aiRow = aiRepo.create({
      tenantId: tenant.id,
      userId: user.id,
      layoutId: body.layoutId,
      prompt: body.prompt,
      generatedConfig: inferred.config,
      widgetType: inferred.widgetType,
      status: "active"
    });
    await aiRepo.save(aiRow);

    const existing = await widgetRepo.find({ where: { layoutId: body.layoutId } });
    const maxY = existing.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const nextWidgets = [
      ...existing.map((w) => ({
        id: w.id,
        layoutId: w.layoutId,
        widgetType: w.widgetType,
        title: w.title ?? null,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        size: w.size as "xs" | "sm" | "md" | "lg" | "xl",
        visible: w.visible,
        config: (w.config ?? {}) as Record<string, unknown>,
        sortOrder: w.sortOrder
      })),
      {
        id: `new-${Date.now()}`,
        layoutId: body.layoutId,
        widgetType: inferred.widgetType,
        title: body.prompt.slice(0, 60),
        x: 0,
        y: maxY,
        w: def.defaultW,
        h: def.defaultH,
        size: def.size,
        visible: true,
        config: inferred.config,
        sortOrder: existing.length
      }
    ];

    const saved = await saveLayoutWidgets(body.layoutId, tenant.id, user.id, entitlements, nextWidgets);
    return NextResponse.json({ ok: true, aiWidget: aiRow, layout: saved, inferred });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid prompt or layout", details: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[dashboard/ai-widgets POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro" },
      { status: 400 }
    );
  }
}
