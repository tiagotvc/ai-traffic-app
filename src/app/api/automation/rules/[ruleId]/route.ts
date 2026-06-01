import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  condition: z
    .object({
      metric: z.enum(["cpl", "spend", "conversions"]),
      op: z.enum(["gt", "lt", "gte"]),
      value: z.number(),
      minSpend: z.number().optional()
    })
    .optional(),
  action: z
    .object({
      type: z.enum(["pause_campaign", "alert_only"])
    })
    .optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const { tenant } = await getAppContext();
  const { automationRule: repo } = await repositories();
  const rule = await repo.findOne({ where: { id: ruleId, tenantId: tenant.id } });
  if (!rule) return NextResponse.json({ ok: false, error: "Regra não encontrada" }, { status: 404 });

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  if (body.name != null) rule.name = body.name;
  if (body.enabled != null) rule.enabled = body.enabled;
  if (body.condition) rule.condition = body.condition;
  if (body.action) rule.action = body.action;
  await repo.save(rule);
  return NextResponse.json({ ok: true, rule });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const { tenant } = await getAppContext();
  const { automationRule: repo } = await repositories();
  const rule = await repo.findOne({ where: { id: ruleId, tenantId: tenant.id } });
  if (!rule) return NextResponse.json({ ok: false, error: "Regra não encontrada" }, { status: 404 });
  await repo.remove(rule);
  return NextResponse.json({ ok: true });
}
