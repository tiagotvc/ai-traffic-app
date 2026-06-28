import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

function computeNextRun(frequency: string, dayOfWeek: number | null, hourUtc: number) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (frequency === "daily") {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (frequency === "weekly") {
    const target = dayOfWeek ?? 1;
    const diff = (target - next.getUTCDay() + 7) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + diff);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  next.setUTCDate(1);
  if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

const BodySchema = z.object({
  name: z.string().min(1),
  clientId: z.string().nullable().optional(),
  format: z.enum(["pdf", "whatsapp"]).default("pdf"),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  dayOfWeek: z.number().min(0).max(6).nullable().optional(),
  hourUtc: z.number().min(0).max(23).default(12),
  recipients: z.array(z.string().email()).default([]),
  enabled: z.boolean().optional()
});

export async function GET() {
  const { tenant } = await getAppContext();
  const { reportSchedule: repo, client: clientRepo } = await repositories();
  const schedules = await repo.find({ where: { tenantId: tenant.id }, order: { createdAt: "DESC" } });
  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  return NextResponse.json({
    ok: true,
    schedules: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      clientId: s.clientId,
      clientName: s.clientId ? clientMap.get(s.clientId) ?? null : null,
      format: s.format,
      frequency: s.frequency,
      dayOfWeek: s.dayOfWeek,
      hourUtc: s.hourUtc,
      recipients: s.recipients,
      enabled: s.enabled,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      nextRunAt: s.nextRunAt?.toISOString() ?? null
    }))
  });
}

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  // Respeita o limite do plano (maxScheduledReports).
  try {
    const { assertLimit } = await import("@/lib/billing/entitlements");
    await assertLimit(tenant.id, "maxScheduledReports");
  } catch (err) {
    const { billingErrorResponse } = await import("@/lib/billing/api-errors");
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const { reportSchedule: repo } = await repositories();

  let clientId: string | null = null;
  if (body.clientId) {
    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    clientId = client.id;
  }

  const nextRunAt = computeNextRun(
    body.frequency,
    body.dayOfWeek ?? null,
    body.hourUtc
  );

  const row = await repo.save(
    repo.create({
      tenantId: tenant.id,
      clientId,
      name: body.name,
      format: body.format,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek ?? null,
      hourUtc: body.hourUtc,
      recipients: body.recipients,
      enabled: body.enabled ?? true,
      nextRunAt
    })
  );

  return NextResponse.json({ ok: true, schedule: row });
}
