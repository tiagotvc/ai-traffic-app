import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const severity = url.searchParams.get("severity");
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

  const { alert: alertRepo, client: clientRepo } = await repositories();

  const now = new Date();
  const alerts = await alertRepo.find({
    where: {
      tenantId: tenant.id,
      dismissed: false,
      ...(severity === "critical" || severity === "warning" ? { severity } : {})
    },
    order: { createdAt: "DESC" },
    take: limit * 2
  });

  const active = alerts.filter((a) => !a.snoozedUntil || a.snoozedUntil <= now).slice(0, limit);

  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const rows = active
    .map((a) => {
      const c = a.clientId ? clientMap.get(a.clientId) : null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        message: a.description,
        type: a.type,
        severity: a.severity,
        clientId: a.clientId,
        clientName: c?.name ?? null,
        clientSlug: c ? slugify(c.name) : null,
        metaCampaignId: a.metaCampaignId,
        actualValue: a.actualValue != null ? Number(a.actualValue) : null,
        thresholdValue: a.thresholdValue != null ? Number(a.thresholdValue) : null,
        metricKey: a.metricKey,
        createdAt: a.createdAt.toISOString(),
        acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
        acknowledgedBy: a.acknowledgedBy ?? null,
        snoozedUntil: a.snoozedUntil?.toISOString() ?? null
      };
    })
    .filter((a) => {
      if (!q) return true;
      const hay = `${a.title} ${a.description} ${a.clientName ?? ""} ${a.type}`.toLowerCase();
      return hay.includes(q);
    });

  return NextResponse.json({ ok: true, alerts: rows, total: rows.length });
}
