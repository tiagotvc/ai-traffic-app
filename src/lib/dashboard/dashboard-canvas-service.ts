import "server-only";

import { In } from "typeorm";

import type { DashboardWidgetInstance } from "@/db/entities/DashboardWidgetInstance";
import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import type { Entitlements } from "@/lib/billing/types";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_SECTIONS,
  type DashboardLayoutPrefs
} from "@/lib/dashboard-layout-prefs";
import {
  maxDashboardsForPlan,
  maxWidgetsForPlan
} from "@/lib/dashboard/dashboard-widget-permissions";
import type { LayoutDto, WidgetInstanceDto, WidgetSize } from "@/lib/dashboard/widget-catalog";
import { getWidgetDefinition, WIDGET_BY_TYPE } from "@/lib/dashboard/widget-catalog";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  type MetricKey
} from "@/lib/dashboard-metrics";
import {
  getUserDashboardChartMetrics,
  getUserDashboardLayout
} from "@/lib/user-dashboard-prefs";

function toWidgetDto(row: DashboardWidgetInstance): WidgetInstanceDto {
  return {
    id: row.id,
    layoutId: row.layoutId,
    widgetType: row.widgetType,
    title: row.title ?? null,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    size: row.size as WidgetSize,
    visible: row.visible,
    config: (row.config ?? {}) as Record<string, unknown>,
    sortOrder: row.sortOrder
  };
}

function defaultWidgetsFromLegacyPrefs(
  prefs: DashboardLayoutPrefs,
  chartMetrics: MetricKey[]
): Omit<WidgetInstanceDto, "id" | "layoutId">[] {
  const sections = prefs.sections ?? DEFAULT_DASHBOARD_SECTIONS;
  const items: Omit<WidgetInstanceDto, "id" | "layoutId">[] = [];
  let y = 0;

  const push = (
    widgetType: string,
    w: number,
    h: number,
    config: Record<string, unknown> = {}
  ) => {
    const def = getWidgetDefinition(widgetType);
    items.push({
      widgetType,
      title: null,
      x: 0,
      y,
      w,
      h,
      size: (def?.size ?? "md") as WidgetSize,
      visible: true,
      config,
      sortOrder: items.length
    });
    y += h;
  };

  if (sections.brainShelf) push("brain.learnings", 12, 2);
  if (sections.heroKpis) {
    push("metrics.heroKpis", 12, 3, {
      heroMetrics: prefs.heroMetrics ?? []
    });
  }
  if (sections.secondaryMetrics) push("metrics.quickPills", 12, 1);
  if (sections.chart || sections.alerts) {
    const chartY = y;
    if (sections.chart) {
      items.push({
        widgetType: "chart.performance",
        title: null,
        x: 0,
        y: chartY,
        w: sections.alerts ? 8 : 12,
        h: 4,
        size: "lg",
        visible: true,
        config: { chartMetrics },
        sortOrder: items.length
      });
    }
    if (sections.alerts) {
      items.push({
        widgetType: "alerts.feed",
        title: null,
        x: sections.chart ? 8 : 0,
        y: chartY,
        w: sections.chart ? 4 : 12,
        h: 4,
        size: "md",
        visible: true,
        config: {},
        sortOrder: items.length
      });
    }
    y = chartY + 4;
  }
  if (sections.agencyHealth) push("clients.health", 12, 4);

  if (!items.length) {
    push("metrics.heroKpis", 12, 3);
    push("chart.performance", 12, 4, { chartMetrics });
  }

  return items;
}

export async function migrateLegacyLayoutIfNeeded(
  tenantId: string,
  userId: string,
  entitlements: Entitlements
): Promise<LayoutDto | null> {
  if (!entitlements.limits.allowDashboardCanvas) return null;

  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
    await repositories();

  const existing = await layoutRepo.findOne({
    where: { tenantId, userId, isDefault: true }
  });
  if (existing) {
    return getLayoutWithWidgets(existing.id, tenantId, userId);
  }

  const [prefs, chartMetrics] = await Promise.all([
    getUserDashboardLayout(tenantId, userId),
    getUserDashboardChartMetrics(tenantId, userId)
  ]);

  const layout = layoutRepo.create({
    tenantId,
    userId,
    name: "Principal",
    slug: "principal",
    isDefault: true,
    sortOrder: 0
  });
  const savedLayout = await layoutRepo.save(layout);

  const draft = defaultWidgetsFromLegacyPrefs(
    prefs ?? DEFAULT_DASHBOARD_LAYOUT,
    chartMetrics ?? DEFAULT_DASHBOARD_CHART_METRICS
  );

  const rows = draft.map((d) =>
    widgetRepo.create({
      layoutId: savedLayout.id,
      widgetType: d.widgetType,
      title: d.title,
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
      size: d.size,
      visible: d.visible,
      config: d.config,
      sortOrder: d.sortOrder
    })
  );
  await widgetRepo.save(rows);

  return getLayoutWithWidgets(savedLayout.id, tenantId, userId);
}

export async function listDashboardLayouts(
  tenantId: string,
  userId: string,
  entitlements: Entitlements
): Promise<LayoutDto[]> {
  await migrateLegacyLayoutIfNeeded(tenantId, userId, entitlements);

  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
    await repositories();

  const layouts = await layoutRepo.find({
    where: { tenantId, userId },
    order: { sortOrder: "ASC", createdAt: "ASC" }
  });

  const result: LayoutDto[] = [];
  for (const layout of layouts) {
    const widgets = await widgetRepo.find({
      where: { layoutId: layout.id },
      order: { sortOrder: "ASC", y: "ASC", x: "ASC" }
    });
    result.push({
      id: layout.id,
      name: layout.name,
      slug: layout.slug,
      isDefault: layout.isDefault,
      icon: layout.icon ?? null,
      sortOrder: layout.sortOrder,
      widgets: widgets.map(toWidgetDto)
    });
  }
  return result;
}

export async function getLayoutWithWidgets(
  layoutId: string,
  tenantId: string,
  userId: string
): Promise<LayoutDto | null> {
  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
    await repositories();

  const layout = await layoutRepo.findOne({ where: { id: layoutId, tenantId, userId } });
  if (!layout) return null;

  const widgets = await widgetRepo.find({
    where: { layoutId: layout.id },
    order: { sortOrder: "ASC", y: "ASC", x: "ASC" }
  });

  return {
    id: layout.id,
    name: layout.name,
    slug: layout.slug,
    isDefault: layout.isDefault,
    icon: layout.icon ?? null,
    sortOrder: layout.sortOrder,
    widgets: widgets.map(toWidgetDto)
  };
}

export async function createDashboardLayout(
  tenantId: string,
  userId: string,
  entitlements: Entitlements,
  input: { name: string; slug?: string; templateId?: string }
): Promise<LayoutDto> {
  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo, dashboardTemplate: templateRepo } =
    await repositories();

  const layouts = await layoutRepo.count({ where: { tenantId, userId } });
  const max = maxDashboardsForPlan(entitlements.limits);
  if (layouts >= max) throw new Error("Dashboard limit reached");

  const slug = input.slug?.trim() || slugify(input.name) || "dashboard";
  const layout = layoutRepo.create({
    tenantId,
    userId,
    name: input.name.trim(),
    slug,
    isDefault: layouts === 0,
    sortOrder: layouts
  });
  const saved = await layoutRepo.save(layout);

  if (input.templateId) {
    const template = await templateRepo.findOne({ where: { id: input.templateId } });
    if (template && Array.isArray(template.widgets)) {
      const rows = (template.widgets as Array<Record<string, unknown>>).map((w, i) =>
        widgetRepo.create({
          layoutId: saved.id,
          widgetType: String(w.widgetType ?? "metrics.heroKpis"),
          title: typeof w.title === "string" ? w.title : null,
          x: Number(w.x ?? 0),
          y: Number(w.y ?? i * 2),
          w: Number(w.w ?? 6),
          h: Number(w.h ?? 2),
          size: String(w.size ?? "md"),
          visible: w.visible !== false,
          config: (w.config as Record<string, unknown>) ?? {},
          sortOrder: i
        })
      );
      if (rows.length) await widgetRepo.save(rows);
    }
  }

  return (await getLayoutWithWidgets(saved.id, tenantId, userId))!;
}

export async function saveLayoutWidgets(
  layoutId: string,
  tenantId: string,
  userId: string,
  entitlements: Entitlements,
  widgets: WidgetInstanceDto[]
): Promise<LayoutDto> {
  const max = maxWidgetsForPlan(entitlements.limits);
  if (widgets.length > max) throw new Error("Widget limit reached");

  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
    await repositories();

  const layout = await layoutRepo.findOne({ where: { id: layoutId, tenantId, userId } });
  if (!layout) throw new Error("Layout not found");

  await widgetRepo.delete({ layoutId });

  const rows = widgets.map((w, i) =>
    widgetRepo.create({
      id: w.id.startsWith("new-") ? undefined : w.id,
      layoutId,
      widgetType: w.widgetType,
      title: w.title,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      size: w.size,
      visible: w.visible,
      config: w.config ?? {},
      sortOrder: i
    })
  );
  await widgetRepo.save(rows);

  return (await getLayoutWithWidgets(layoutId, tenantId, userId))!;
}

export async function listDashboardTemplates(tenantId: string | null = null) {
  const { dashboardTemplate: templateRepo } = await repositories();
  return templateRepo.find({
    where: [{ tenantId: null as unknown as string, isSystem: true }, { tenantId: tenantId ?? undefined }],
    order: { name: "ASC" }
  });
}

export async function getActiveDashboardAddons(tenantId: string): Promise<string[]> {
  const { dashboardAddon: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId, active: true } });
  const now = Date.now();
  return rows
    .filter((r) => !r.expiresAt || r.expiresAt.getTime() > now)
    .map((r) => r.addonKey);
}

export async function seedWidgetPermissionsIfEmpty() {
  const { dashboardWidgetPermission: repo } = await repositories();
  const count = await repo.count();
  if (count > 0) return;

  const seeds = Object.values(WIDGET_BY_TYPE).map((w) =>
    repo.create({
      widgetType: w.type,
      minPlanSlug: w.minPlan ?? "advanced",
      requiredAddon: w.requiredAddon ?? null,
      allowResize: true,
      isAiWidget: !!w.isAiWidget
    })
  );
  await repo.save(seeds);
}

export async function seedSystemTemplatesIfEmpty() {
  const { dashboardTemplate: repo } = await repositories();
  const count = await repo.count({ where: { isSystem: true } });
  if (count > 0) return;

  const templates = [
    {
      name: "Meta Ads Performance",
      category: "performance",
      minPlanSlug: "advanced",
      widgets: defaultWidgetsFromLegacyPrefs(DEFAULT_DASHBOARD_LAYOUT, DEFAULT_DASHBOARD_CHART_METRICS)
    },
    {
      name: "Agency Brain",
      category: "agency-brain",
      minPlanSlug: "advanced",
      widgets: [
        { widgetType: "ai.agencyBrain", x: 0, y: 0, w: 12, h: 5, size: "xl", config: {} },
        { widgetType: "ai.recentLearnings", x: 0, y: 5, w: 12, h: 3, size: "lg", config: {} },
        { widgetType: "alerts.feed", x: 0, y: 8, w: 12, h: 3, size: "md", config: {} }
      ]
    },
    {
      name: "Executivo",
      category: "executive",
      minPlanSlug: "agency",
      widgets: [
        { widgetType: "metrics.heroKpis", x: 0, y: 0, w: 12, h: 3, size: "lg", config: {} },
        { widgetType: "ai.accountHealth", x: 0, y: 3, w: 4, h: 3, size: "md", config: {} },
        { widgetType: "chart.performance", x: 4, y: 3, w: 8, h: 4, size: "lg", config: {} }
      ]
    }
  ];

  await repo.save(
    templates.map((t) =>
      repo.create({
        tenantId: null,
        name: t.name,
        category: t.category,
        minPlanSlug: t.minPlanSlug,
        widgets: t.widgets,
        isSystem: true
      })
    )
  );
}
