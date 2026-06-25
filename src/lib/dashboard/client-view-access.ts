import "server-only";

import { randomBytes } from "crypto";

import type { DashboardLayout } from "@/db/entities/DashboardLayout";
import type { DashboardWidgetInstance } from "@/db/entities/DashboardWidgetInstance";
import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import type { LayoutDto, WidgetInstanceDto, WidgetSize } from "@/lib/dashboard/widget-catalog";

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

export function generateViewToken(): string {
  return randomBytes(24).toString("base64url");
}

export type PublishedViewAccess = {
  tenantId: string;
  layoutId: string;
  clientId: string | null;
  clientSlug: string | null;
  clientName: string | null;
};

export async function resolvePublishedViewByToken(
  viewToken: string
): Promise<PublishedViewAccess | null> {
  const token = viewToken.trim();
  if (!token) return null;

  const { dashboardLayout: layoutRepo, client: clientRepo } = await repositories();
  const layout = await layoutRepo.findOne({
    where: { viewToken: token, published: true }
  });
  if (!layout) return null;

  let clientSlug: string | null = null;
  let clientName: string | null = null;
  if (layout.clientId) {
    const client = await clientRepo.findOne({
      where: { id: layout.clientId, tenantId: layout.tenantId }
    });
    if (client) {
      clientSlug = slugify(client.name);
      clientName = client.name;
    }
  }

  return {
    tenantId: layout.tenantId,
    layoutId: layout.id,
    clientId: layout.clientId ?? null,
    clientSlug,
    clientName
  };
}

/** Ensures client-scoped views cannot query other clients. */
export function assertViewClientScope(
  view: PublishedViewAccess,
  requestedClient: string | null | undefined
): void {
  if (!view.clientSlug && !view.clientId) return;
  if (!requestedClient?.trim()) return;

  const req = decodeURIComponent(requestedClient.trim());
  const allowed =
    req === view.clientSlug ||
    req === view.clientId ||
    (view.clientId && req === view.clientId);
  if (!allowed) {
    throw new Error("Client scope mismatch");
  }
}

export async function getPublishedLayoutByToken(viewToken: string): Promise<LayoutDto | null> {
  const token = viewToken.trim();
  if (!token) return null;

  const { dashboardLayout: layoutRepo, dashboardWidgetInstance: widgetRepo, client: clientRepo } =
    await repositories();

  const layout = await layoutRepo.findOne({
    where: { viewToken: token, published: true }
  });
  if (!layout) return null;

  const widgets = await widgetRepo.find({
    where: { layoutId: layout.id },
    order: { sortOrder: "ASC", y: "ASC", x: "ASC" }
  });

  let clientName: string | null = null;
  let clientSlug: string | null = null;
  if (layout.clientId) {
    const client = await clientRepo.findOne({
      where: { id: layout.clientId, tenantId: layout.tenantId }
    });
    if (client) {
      clientName = client.name;
      clientSlug = slugify(client.name);
    }
  }

  return layoutRowToDto(layout, widgets.map(toWidgetDto), { clientName, clientSlug });
}

export function layoutRowToDto(
  layout: DashboardLayout,
  widgets: LayoutDto["widgets"],
  client?: { clientName: string | null; clientSlug: string | null }
): LayoutDto {
  return {
    id: layout.id,
    name: layout.name,
    subtitle: layout.subtitle ?? null,
    slug: layout.slug,
    isDefault: layout.isDefault,
    icon: layout.icon ?? null,
    sortOrder: layout.sortOrder,
    clientId: layout.clientId ?? null,
    clientName: client?.clientName ?? null,
    clientSlug: client?.clientSlug ?? null,
    published: layout.published ?? false,
    publishedAt: layout.publishedAt?.toISOString() ?? null,
    viewToken: layout.viewToken ?? null,
    widgets
  };
}
