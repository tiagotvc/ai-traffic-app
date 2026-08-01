import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { planFeatureVisibility } = await repositories();
  const rows = await planFeatureVisibility.find({ order: { sortOrder: "ASC" } });
  return NextResponse.json({ ok: true, rows });
}

const patchSchema = z.object({
  featureKey: z.string().min(1).max(80),
  showCompact: z.boolean().optional(),
  showFull: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional()
});

export async function PATCH(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const body = patchSchema.parse(await req.json());
    const { planFeatureVisibility } = await repositories();

    const row = await planFeatureVisibility.findOne({ where: { featureKey: body.featureKey } });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Recurso não encontrado" }, { status: 404 });
    }

    if (body.showCompact !== undefined) row.showCompact = body.showCompact;
    if (body.showFull !== undefined) row.showFull = body.showFull;
    if (body.sortOrder !== undefined) row.sortOrder = body.sortOrder;

    await planFeatureVisibility.save(row);
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
