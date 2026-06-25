import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const BodySchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
  condition: z.object({
    metric: z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas"]),
    op: z.enum(["gt", "lt", "gte"]),
    value: z.number(),
    minSpend: z.number().optional()
  }),
  action: z.object({
    type: z.enum(["pause_campaign", "alert_only", "adjust_budget_percent"]),
    budgetPercent: z.number().min(1).max(50).optional()
  })
});

export async function GET() {
  const { tenant } = await getAppContext();
  const repos = await repositories();
  const rules = await repos.automationRule.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" }
  });

  // Logs de execução derivados dos Alertas gerados pelo motor (Alert.automationRuleId).
  let statsByRule = new Map<string, { count: number; last: string | null }>();
  try {
    const raw = await repos.alert
      .createQueryBuilder("a")
      .select("a.automationRuleId", "ruleId")
      .addSelect("COUNT(*)", "count")
      .addSelect("MAX(a.createdAt)", "last")
      .where("a.tenantId = :t", { t: tenant.id })
      .andWhere("a.automationRuleId IS NOT NULL")
      .groupBy("a.automationRuleId")
      .getRawMany<{ ruleId: string; count: string; last: string | Date }>();
    statsByRule = new Map(
      raw.map((r) => [
        r.ruleId,
        { count: Number(r.count), last: r.last ? new Date(r.last).toISOString() : null }
      ])
    );
  } catch {
    /* best-effort — se a coluna/índice não existir, segue sem logs */
  }

  const enriched = rules.map((r) => ({
    ...r,
    executionCount: statsByRule.get(r.id)?.count ?? 0,
    lastExecutionAt: statsByRule.get(r.id)?.last ?? null
  }));

  return NextResponse.json({ ok: true, rules: enriched });
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
