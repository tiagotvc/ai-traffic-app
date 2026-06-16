import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { customTypeKey, normalizeTypeMetrics } from "@/lib/campaign-type-store";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  metrics: z
    .array(z.string())
    .min(1)
    .max(8)
    .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida")
    .optional(),
  shared: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  const { id } = await ctx.params;
  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const { campaignTypeDefinition: repo } = await repositories();
  const row = await repo.findOne({ where: { id, tenantId: tenant.id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!row.shared && row.createdByUserId !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (body.name !== undefined) row.name = body.name.trim();
  if (body.metrics !== undefined) row.metrics = normalizeTypeMetrics(body.metrics);
  if (body.shared !== undefined) row.shared = body.shared;
  await repo.save(row);
  return NextResponse.json({
    ok: true,
    type: {
      id: row.id,
      name: row.name,
      metrics: normalizeTypeMetrics(row.metrics),
      shared: row.shared,
      createdByUserId: row.createdByUserId
    }
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  const { id } = await ctx.params;
  const { campaignTypeDefinition: typeRepo, campaignPreset: presetRepo } = await repositories();
  const row = await typeRepo.findOne({ where: { id, tenantId: tenant.id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!row.shared && row.createdByUserId !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const key = customTypeKey(id);
  const presets = await presetRepo.find({ where: { tenantId: tenant.id, preset: key } });
  for (const p of presets) {
    p.preset = "default";
    await presetRepo.save(p);
  }
  await typeRepo.remove(row);
  return NextResponse.json({ ok: true });
}
