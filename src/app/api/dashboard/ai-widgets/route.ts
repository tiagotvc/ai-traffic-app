import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { saveLayoutWidgets } from "@/lib/dashboard/dashboard-canvas-service";
import {
  assertDashboardCanvas,
  DashboardCanvasForbiddenError
} from "@/lib/dashboard/dashboard-widget-permissions";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

const PostSchema = z.object({
  layoutId: z.string().uuid(),
  prompt: z.string().min(10).max(2000)
});

function inferWidgetFromPrompt(prompt: string): { widgetType: string; config: Record<string, unknown> } {
  const lower = prompt.toLowerCase();
  if (lower.includes("roas") && lower.includes("cpa")) {
    return { widgetType: "chart.roasCpa", config: { metricA: "roas", metricB: "cpa" } };
  }
  if (lower.includes("spend") && lower.includes("conversion")) {
    return { widgetType: "chart.spendConversions", config: { metricA: "spend", metricB: "conversions" } };
  }
  if (lower.includes("health") || lower.includes("saúde")) {
    return { widgetType: "ai.accountHealth", config: {} };
  }
  if (lower.includes("brain") || lower.includes("cérebro")) {
    return { widgetType: "ai.agencyBrain", config: {} };
  }
  for (const key of ["roas", "cpa", "ctr", "spend", "conversions"] as const) {
    if (lower.includes(key)) {
      return { widgetType: `metric.single.${key}`, config: { metricKey: key } };
    }
  }
  return { widgetType: "metrics.heroKpis", config: {} };
}

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
    const { tenant, user, entitlements } = await getAppContext();
    assertDashboardCanvas(entitlements);
    if (!entitlements.limits.allowDashboardAiBuilder) {
      return NextResponse.json({ ok: false, error: "AI builder not available" }, { status: 403 });
    }

    const body = PostSchema.parse(await req.json().catch(() => ({})));
    const inferred = inferWidgetFromPrompt(body.prompt);
    const def = getWidgetDefinition(inferred.widgetType);
    if (!def) {
      return NextResponse.json({ ok: false, error: "Could not infer widget" }, { status: 400 });
    }

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
    return NextResponse.json({ ok: true, aiWidget: aiRow, layout: saved });
  } catch (err) {
    if (err instanceof DashboardCanvasForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    console.error("[dashboard/ai-widgets POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro" },
      { status: 400 }
    );
  }
}
