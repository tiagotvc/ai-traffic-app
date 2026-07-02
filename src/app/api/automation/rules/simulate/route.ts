import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { simulateRule } from "@/lib/automation/simulate";

const MetricEnum = z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas"]);
const OpEnum = z.enum(["gt", "lt", "gte"]);
const ConditionItem = z.object({ metric: MetricEnum, op: OpEnum, value: z.number() });

const BodySchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  days: z.number().int().min(7).max(90).optional(),
  condition: z.object({
    groups: z.array(z.array(ConditionItem).min(1).max(5)).min(1).max(4).optional(),
    match: z.enum(["all", "any"]).optional(),
    conditions: z.array(ConditionItem).min(1).max(5).optional(),
    metric: MetricEnum.optional(),
    op: OpEnum.optional(),
    value: z.number().optional(),
    minSpend: z.number().optional(),
    schedule: z
      .object({
        startHour: z.number().int().min(0).max(23),
        endHour: z.number().int().min(0).max(23)
      })
      .optional()
  }),
  action: z.object({
    type: z.enum([
      "pause_campaign",
      "alert_only",
      "adjust_budget_percent",
      "schedule_toggle",
      "reactivate_campaign",
      "notify_email",
      "scale_gradual"
    ]),
    budgetPercent: z.number().min(1).max(50).optional(),
    steps: z.number().int().min(2).max(10).optional(),
    recipientEmail: z.string().email().optional()
  })
});

/**
 * Backtest (read-only) de uma regra contra o histórico do tenant: "nos últimos N dias essa
 * regra teria disparado em X campanhas e evitado R$ Y". Nada é executado nem persistido.
 */
export async function POST(req: Request) {
  const { tenant, entitlements } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (entitlements.limits.automationTier < 2) {
    return NextResponse.json({ ok: true, result: { supported: false, reason: "plan" } });
  }

  const result = await simulateRule(tenant.id, {
    condition: body.condition,
    action: body.action,
    clientId: body.clientId ?? null,
    days: body.days
  });

  return NextResponse.json({ ok: true, result });
}
