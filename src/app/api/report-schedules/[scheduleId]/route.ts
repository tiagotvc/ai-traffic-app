import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({
  enabled: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const { tenant } = await getAppContext();
  const { reportSchedule: repo } = await repositories();
  const row = await repo.findOne({ where: { id: scheduleId, tenantId: tenant.id } });
  if (!row) return NextResponse.json({ ok: false, error: "Agendamento não encontrado" }, { status: 404 });
  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  if (body.enabled != null) row.enabled = body.enabled;
  await repo.save(row);
  return NextResponse.json({ ok: true, schedule: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const { tenant } = await getAppContext();
  const { reportSchedule: repo } = await repositories();
  const row = await repo.findOne({ where: { id: scheduleId, tenantId: tenant.id } });
  if (!row) return NextResponse.json({ ok: false, error: "Agendamento não encontrado" }, { status: 404 });
  await repo.remove(row);
  return NextResponse.json({ ok: true });
}
