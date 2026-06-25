import "server-only";

import { In, IsNull } from "typeorm";

import type { DashboardWidgetInstance } from "@/db/entities/DashboardWidgetInstance";
import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import { isUuid } from "@/lib/uuid";
import type { Entitlements } from "@/lib/billing/types";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_SECTIONS,
  type DashboardLayoutPrefs
} from "@/lib/dashboard-layout-prefs";
import {
  maxDashboardsForPlan,
  maxWidgetsForPlan,
  assertDashboardCanvas
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
import {
  heroKpiCardsDraft,
  highlightsLayoutNeedsPrepare,
  prepareHighlightsLayoutWidgets,
  secondaryKpiCardsDraft,
  secondaryRowCount
} from "@/lib/dashboard/highlights-layout-widgets";
import {
  SYSTEM_DASHBOARD_TEMPLATE_CATALOG
} from "@/lib/dashboard/dashboard-system-templates";
import {
  generateViewToken,
  layoutRowToDto
} from "@/lib/dashboard/client-view-access";
import {
  defaultFilterConfig,
  defaultTableConfig
} from "@/lib/dashboard/app-block-config";
import type { DashboardLayout } from "@/db/entities/DashboardLayout";

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

async function clientMetaById(
  tenantId: string,
  clientIds: string[]
): Promise<Map<string, { clientName: string; clientSlug: string }>> {
  const map = new Map<string, { clientName: string; clientSlug: string }>();
  if (!clientIds.length) return map;
  const { client: clientRepo } = await repositories();
  const clients = await clientRepo.find({
    where: { tenantId, id: In(clientIds) }
  });
  for (const c of clients) {
    map.set(c.id, { clientName: c.name, clientSlug: slugify(c.name) });
  }
  return map;
}

function layoutClientMeta(
  layout: DashboardLayout,
  meta: Map<string, { clientName: string; clientSlug: string }>
) {
  if (!layout.clientId) {
    return { clientName: null, clientSlug: null };
  }
  const row = meta.get(layout.clientId);
  return {
    clientName: row?.clientName ?? null,
    clientSlug: row?.clientSlug ?? null
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

  if (sections.brainShelf) push("brain.learnings", 12, 1);
  if (sections.heroKpis) {
    const cards = heroKpiCardsDraft(y, prefs.heroMetrics ?? [], items.length);
    items.push(...cards);
    y += 2;
  }
  if (sections.secondaryMetrics) {
    const cards = secondaryKpiCardsDraft(y, prefs.heroMetrics ?? [], items.length);
    items.push(...cards);
    y += secondaryRowCount(cards.length);
  }
  if (sections.chart || sections.alerts) {
    const chartY = y;
    if (sections.chart) {
      items.push({
        widgetType: "chart.performance",
        title: null,
        x: 0,
        y: chartY,
        w: sections.alerts ? 8 : 12,
        h: 8,
        size: "lg",
        visible: true,
        config: { chartMetrics, chartStyle: "area" },
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
        h: 5,
        size: "md",
        visible: true,
        config: { density: "stacked" },
        sortOrder: items.length
      });
    }
    y = chartY + (sections.alerts ? 5 : 8);
  }
  if (sections.ageBreakdown) {
    push("analytics.ageBreakdown", 12, 5);
  }
  if (sections.agencyHealth) {
    push("clients.health", 12, 6, { view: "full" });
  }

  if (!items.length) {
    items.push(...heroKpiCardsDraft(0, prefs.heroMetrics ?? [], 0));
    y = 2;
    push("chart.performance", 12, 4, { chartMetrics, chartStyle: "area" });
  }

  return prepareHighlightsLayoutWidgets(
    items.map((d, i) => ({ ...d, id: `seed-${i}`, layoutId: "" })),
    prefs.heroMetrics
  ).map(({ id: _id, layoutId: _layoutId, ...rest }) => rest);
}

/** Widgets for the classic V2-style default dashboard (Principal). */
export async function buildDefaultLayoutWidgets(
  tenantId: string,
  userId: string
): Promise<Omit<WidgetInstanceDto, "id" | "layoutId">[]> {
  const [prefs, chartMetrics] = await Promise.all([
    getUserDashboardLayout(tenantId, userId),
    getUserDashboardChartMetrics(tenantId, userId)
  ]);
  return defaultWidgetsFromLegacyPrefs(
    prefs ?? DEFAULT_DASHBOARD_LAYOUT,
    chartMetrics ?? DEFAULT_DASHBOARD_CHART_METRICS
  );
}

export async function resetDashboardLayoutToDefault(
  layoutId: string,
  tenantId: string,
  userId: string,
  entitlements: Entitlements
): Promise<LayoutDto> {
  assertDashboardCanvas(entitlements);
  const draft = await buildDefaultLayoutWidgets(tenantId, userId);
  const widgets: WidgetInstanceDto[] = draft.map((d, i) => ({
    ...d,
    id: `reset-${Date.now()}-${i}`,
    layoutId
  }));
  return saveLayoutWidgets(layoutId, tenantId, userId, entitlements, widgets);
}

export async function applyTemplateToLayout(
  layoutId: string,
  templateId: string,
  tenantId: string,
  userId: string,
  entitlements: Entitlements
): Promise<LayoutDto> {
  assertDashboardCanvas(entitlements);
  const { dashboardTemplate: templateRepo } = await repositories();
  const template = await templateRepo.findOne({ where: { id: templateId } });
  if (!template || !Array.isArray(template.widgets)) {
    throw new Error("Template not found");
  }

  const widgets: WidgetInstanceDto[] = (
    template.widgets as Array<Record<string, unknown>>
  ).map((w, i) => ({
    id: `tpl-${Date.now()}-${i}`,
    layoutId,
    widgetType: String(w.widgetType ?? "metrics.heroKpis"),
    title: null,
    x: Number(w.x ?? 0),
    y: Number(w.y ?? i * 2),
    w: Number(w.w ?? 6),
    h: Number(w.h ?? 2),
    size: String(w.size ?? "md") as WidgetSize,
    visible: w.visible !== false,
    config: (w.config as Record<string, unknown>) ?? {},
    sortOrder: i
  }));

  return saveLayoutWidgets(layoutId, tenantId, userId, entitlements, widgets);
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
    const withWidgets = await getLayoutWithWidgets(existing.id, tenantId, userId);
    if (withWidgets && withWidgets.widgets.length === 0) {
      return resetDashboardLayoutToDefault(existing.id, tenantId, userId, entitlements);
    }
    return withWidgets;
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

export async function ensureDefaultLayoutsHaveWidgets(
  tenantId: string,
  userId: string,
  entitlements: Entitlements,
  layouts: LayoutDto[]
): Promise<LayoutDto[]> {
  if (!layouts.length) return layouts;

  const defaultLayout = layouts.find((l) => l.isDefault) ?? layouts[0];
  if (!defaultLayout) return layouts;

  if (defaultLayout.widgets.length === 0) {
    const seeded = await resetDashboardLayoutToDefault(
      defaultLayout.id,
      tenantId,
      userId,
      entitlements
    );
    return layouts.map((l) => (l.id === seeded.id ? seeded : l));
  }

  const prefs = await getUserDashboardLayout(tenantId, userId);

  if (
    highlightsLayoutNeedsPrepare(defaultLayout.widgets, prefs?.heroMetrics)
  ) {
    const prepared = prepareHighlightsLayoutWidgets(
      defaultLayout.widgets,
      prefs?.heroMetrics
    );
    const saved = await saveLayoutWidgets(
      defaultLayout.id,
      tenantId,
      userId,
      entitlements,
      prepared
    );
    return layouts.map((l) => (l.id === saved.id ? saved : l));
  }

  return layouts;
}

export async function listDashboardLayouts(
  tenantId: string,
  userId: string,
  _entitlements: Entitlements
): Promise<LayoutDto[]> {
  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo } =
    await repositories();

  const layouts = await layoutRepo.find({
    where: { tenantId, userId },
    order: { sortOrder: "ASC", createdAt: "ASC" }
  });

  const clientIds = layouts.map((l) => l.clientId).filter(Boolean) as string[];
  const clientMeta = await clientMetaById(tenantId, clientIds);

  const result: LayoutDto[] = [];
  for (const layout of layouts) {
    const widgets = await widgetRepo.find({
      where: { layoutId: layout.id },
      order: { sortOrder: "ASC", y: "ASC", x: "ASC" }
    });
    result.push(
      layoutRowToDto(layout, widgets.map(toWidgetDto), layoutClientMeta(layout, clientMeta))
    );
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

  const clientMeta = layout.clientId
    ? await clientMetaById(tenantId, [layout.clientId])
    : new Map();

  return layoutRowToDto(
    layout,
    widgets.map(toWidgetDto),
    layoutClientMeta(layout, clientMeta)
  );
}

export async function createDashboardLayout(
  tenantId: string,
  userId: string,
  entitlements: Entitlements,
  input: { name: string; slug?: string; templateId?: string; clientId?: string }
): Promise<LayoutDto> {
  const {
    dashboardLayout: layoutRepo,
    dashboardWidgetInstance: widgetRepo,
    dashboardTemplate: templateRepo,
    client: clientRepo
  } = await repositories();

  const layouts = await layoutRepo.count({ where: { tenantId, userId } });
  const max = maxDashboardsForPlan(entitlements.limits);
  if (layouts >= max) throw new Error("Dashboard limit reached");

  let clientSlug: string | null = null;
  let clientName: string | null = null;
  if (input.clientId) {
    const client = await clientRepo.findOne({
      where: { id: input.clientId, tenantId }
    });
    if (!client) throw new Error("Client not found");
    clientName = client.name;
    clientSlug = slugify(client.name);
  }

  const defaultName =
    input.name.trim() ||
    (clientName ? `Visão ${clientName}` : "Nova visão");
  const slug = input.slug?.trim() || slugify(defaultName) || "dashboard";
  const layout = layoutRepo.create({
    tenantId,
    userId,
    name: defaultName,
    slug,
    isDefault: layouts === 0,
    sortOrder: layouts,
    clientId: input.clientId ?? null
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
  } else if (clientSlug) {
    const filterCfg = {
      ...defaultFilterConfig(),
      showClient: false,
      showAccount: true,
      showPeriod: true,
      clientFilter: clientSlug,
      periodPreset: "last30" as const
    };
    const tableCfg = {
      ...defaultTableConfig(),
      showTitle: true,
      title: clientName ?? undefined,
      periodPreset: "last30" as const
    };
    await widgetRepo.save([
      widgetRepo.create({
        layoutId: saved.id,
        widgetType: "app.filters",
        title: null,
        x: 0,
        y: 0,
        w: 12,
        h: 1,
        size: "md",
        visible: true,
        config: filterCfg,
        sortOrder: 0
      }),
      widgetRepo.create({
        layoutId: saved.id,
        widgetType: "app.table",
        title: clientName,
        x: 0,
        y: 1,
        w: 12,
        h: 4,
        size: "lg",
        visible: true,
        config: tableCfg,
        sortOrder: 1
      })
    ]);
  }

  return (await getLayoutWithWidgets(saved.id, tenantId, userId))!;
}

export async function setDashboardLayoutPublished(
  layoutId: string,
  tenantId: string,
  userId: string,
  published: boolean
): Promise<LayoutDto> {
  const { dashboardLayout: layoutRepo } = await repositories();
  const layout = await layoutRepo.findOne({ where: { id: layoutId, tenantId, userId } });
  if (!layout) throw new Error("Layout not found");

  layout.published = published;
  if (published) {
    if (!layout.viewToken) layout.viewToken = generateViewToken();
    layout.publishedAt = new Date();
  }
  await layoutRepo.save(layout);

  return (await getLayoutWithWidgets(layoutId, tenantId, userId))!;
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
      id: isUuid(w.id) ? w.id : undefined,
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

export async function deleteDashboardLayout(
  tenantId: string,
  userId: string,
  entitlements: Entitlements,
  layoutId: string
): Promise<LayoutDto[]> {
  const { dashboardLayout: layoutRepo } = await repositories();
  const layout = await layoutRepo.findOne({ where: { id: layoutId, tenantId, userId } });
  if (!layout) throw new Error("Layout not found");

  const all = await layoutRepo.find({
    where: { tenantId, userId },
    order: { sortOrder: "ASC", createdAt: "ASC" }
  });

  if (layout.isDefault && all.length > 1) {
    const next = all.find((l) => l.id !== layoutId);
    if (next) {
      await layoutRepo.update({ id: next.id }, { isDefault: true });
    }
  }

  await layoutRepo.delete({ id: layoutId });
  return listDashboardLayouts(tenantId, userId, entitlements);
}

export async function listDashboardTemplates(tenantId: string) {
  const { dashboardTemplate: templateRepo } = await repositories();
  const [system, tenant] = await Promise.all([
    templateRepo.find({ where: { tenantId: IsNull(), isSystem: true }, order: { name: "ASC" } }),
    templateRepo.find({ where: { tenantId, isSystem: false }, order: { name: "ASC" } })
  ]);
  const dedupedSystem = dedupeTemplatesByName(system);
  return [...dedupedSystem, ...tenant];
}

function dedupeTemplatesByName<T extends { id: string; name: string; updatedAt?: Date }>(rows: T[]): T[] {
  const byName = new Map<string, T>();
  for (const row of rows) {
    const prev = byName.get(row.name);
    if (!prev) {
      byName.set(row.name, row);
      continue;
    }
    const prevTime = prev.updatedAt?.getTime() ?? 0;
    const rowTime = row.updatedAt?.getTime() ?? 0;
    if (rowTime >= prevTime) {
      byName.set(row.name, row);
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getActiveDashboardAddons(tenantId: string): Promise<string[]> {
  const { dashboardAddon: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId, active: true } });
  const now = Date.now();
  return rows
    .filter((r) => !r.expiresAt || r.expiresAt.getTime() > now)
    .map((r) => r.addonKey);
}

export async function getEffectiveDashboardAddons(
  tenantId: string,
  platformAdmin = false
): Promise<string[]> {
  if (platformAdmin) {
    const { MASTER_BLASTER_ADDON } = await import("@/lib/dashboard/master-blaster");
    return [MASTER_BLASTER_ADDON];
  }
  return getActiveDashboardAddons(tenantId);
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

export async function ensureSystemDashboardTemplates() {
  const { dashboardTemplate: repo } = await repositories();
  let existing = await repo.find({ where: { isSystem: true } });

  const dupes: typeof existing = [];
  const groups = new Map<string, typeof existing>();
  for (const row of existing) {
    const g = groups.get(row.name) ?? [];
    g.push(row);
    groups.set(row.name, g);
  }
  for (const [, rows] of groups) {
    if (rows.length <= 1) continue;
    rows.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    dupes.push(...rows.slice(1));
  }
  if (dupes.length) {
    await repo.remove(dupes);
    const dupeIds = new Set(dupes.map((d) => d.id));
    existing = existing.filter((r) => !dupeIds.has(r.id));
  }

  const byName = new Map(existing.map((t) => [t.name, t]));
  const catalogNames = new Set(SYSTEM_DASHBOARD_TEMPLATE_CATALOG.map((t) => t.name));

  const toSave = [];

  for (const spec of SYSTEM_DASHBOARD_TEMPLATE_CATALOG) {
    const row = byName.get(spec.name);
    const specJson = JSON.stringify(spec.widgets);

    if (!row) {
      toSave.push(
        repo.create({
          tenantId: null,
          name: spec.name,
          category: spec.category,
          minPlanSlug: spec.minPlanSlug,
          widgets: spec.widgets,
          isSystem: true
        })
      );
      continue;
    }

    const curJson = JSON.stringify(row.widgets ?? []);
    if (curJson !== specJson) {
      row.widgets = spec.widgets;
      row.category = spec.category;
      row.minPlanSlug = spec.minPlanSlug;
      toSave.push(row);
    }
  }

  if (toSave.length) await repo.save(toSave);

  const stale = existing.filter((t) => t.isSystem && !catalogNames.has(t.name));
  if (stale.length) await repo.remove(stale);
}

/** @deprecated use ensureSystemDashboardTemplates */
export async function seedSystemTemplatesIfEmpty() {
  await ensureSystemDashboardTemplates();
}
