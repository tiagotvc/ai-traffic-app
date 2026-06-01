import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({
  action: z.enum(["dismiss", "snooze", "acknowledge"]),
  snoozeHours: z.number().min(1).max(168).optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;
  const { tenant, user } = await getAppContext();
  const { alert: repo } = await repositories();
  const alert = await repo.findOne({ where: { id: alertId, tenantId: tenant.id } });
  if (!alert) return NextResponse.json({ ok: false, error: "Alerta não encontrado" }, { status: 404 });

  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  if (body.action === "dismiss") {
    alert.dismissed = true;
  } else if (body.action === "snooze") {
    const hours = body.snoozeHours ?? 24;
    alert.snoozedUntil = new Date(Date.now() + hours * 3600 * 1000);
  } else if (body.action === "acknowledge") {
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = user.email;
  }

  await repo.save(alert);
  return NextResponse.json({ ok: true, alert });
}
