import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const MetricEnum = z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas"]);
const OpEnum = z.enum(["gt", "lt", "gte"]);
const ConditionItem = z.object({
  metric: MetricEnum,
  op: OpEnum,
  value: z.number()
});
const ConditionGroupItem = z.array(ConditionItem).min(1).max(5);
const ScheduleSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23)
});

const BodySchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
  // Aceita a forma nova (groups: E dentro do grupo, OU entre grupos), a intermediária
  // (match + conditions[]) e a legada (metric/op/value no topo), além da janela de horário.
  condition: z
    .object({
      groups: z.array(ConditionGroupItem).min(1).max(4).optional(),
      match: z.enum(["all", "any"]).optional(),
      conditions: z.array(ConditionItem).min(1).max(5).optional(),
      metric: MetricEnum.optional(),
      op: OpEnum.optional(),
      value: z.number().optional(),
      minSpend: z.number().optional(),
      schedule: ScheduleSchema.optional()
    })
    .refine(
      (c) => (c.groups?.length ?? 0) > 0 || (c.conditions?.length ?? 0) > 0 || c.metric != null || c.schedule != null,
      { message: "Informe ao menos uma condição." }
    ),
  action: z
    .object({
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
    .refine((a) => a.type !== "notify_email" || !!a.recipientEmail, {
      message: "Informe o e-mail de destino."
    }),
  executionMode: z.enum(["alert", "approval", "auto"]).optional()
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
  const { tenant, entitlements } = await getAppContext();
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

  // `alert`/`approval` exigem automationTier >= 2 — abaixo disso a regra sempre nasce `auto`.
  const executionMode =
    body.executionMode && body.executionMode !== "auto" && entitlements.limits.automationTier < 2
      ? "auto"
      : (body.executionMode ?? "auto");

  const rule = await repo.save(
    repo.create({
      tenantId: tenant.id,
      clientId: body.clientId ?? null,
      name: body.name,
      enabled: body.enabled ?? true,
      condition: body.condition,
      action: body.action,
      executionMode
    })
  );

  return NextResponse.json({ ok: true, rule });
}
