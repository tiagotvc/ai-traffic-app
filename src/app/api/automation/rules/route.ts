import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const BodySchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
  condition: z.object({
    metric: z.enum(["cpl", "spend", "conversions"]),
    op: z.enum(["gt", "lt", "gte"]),
    value: z.number(),
    minSpend: z.number().optional()
  }),
  action: z.object({
    type: z.enum(["pause_campaign", "alert_only"])
  })
});

export async function GET() {
  const { tenant } = await getAppContext();
  const { automationRule: repo } = await repositories();
  const rules = await repo.find({ where: { tenantId: tenant.id }, order: { createdAt: "DESC" } });
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  try {
    const { assertLimit } = await import("@/lib/billing/entitlements");
    await assertLimit(tenant.id, "maxAutomationRules");
  } catch (err) {
    const { billingErrorResponse } = await import("@/lib/billing/api-errors");
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const { automationRule: repo } = await repositories();

  const rule = await repo.save(
    repo.create({
      tenantId: tenant.id,
      clientId: body.clientId ?? null,
      name: body.name,
      enabled: body.enabled ?? true,
      condition: body.condition,
      action: body.action
    })
  );

  return NextResponse.json({ ok: true, rule });
}
