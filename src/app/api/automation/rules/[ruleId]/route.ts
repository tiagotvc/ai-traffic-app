import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const MetricEnum = z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas"]);
const OpEnum = z.enum(["gt", "lt", "gte"]);
const ConditionItem = z.object({ metric: MetricEnum, op: OpEnum, value: z.number() });
const ConditionGroupItem = z.array(ConditionItem).min(1).max(5);
const ScheduleSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23)
});

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
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
    .optional(),
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
    })
    .optional(),
  executionMode: z.enum(["alert", "approval", "auto"]).optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const { tenant, entitlements } = await getAppContext();
  const { automationRule: repo } = await repositories();
  const rule = await repo.findOne({ where: { id: ruleId, tenantId: tenant.id } });
  if (!rule) return NextResponse.json({ ok: false, error: "Regra não encontrada" }, { status: 404 });

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  if (body.name != null) rule.name = body.name;
  if (body.enabled != null) rule.enabled = body.enabled;
  if (body.condition) rule.condition = body.condition;
  if (body.action) rule.action = body.action;
  if (body.executionMode != null) {
    // `alert`/`approval` exigem automationTier >= 2 — abaixo disso a regra fica `auto`.
    rule.executionMode =
      body.executionMode !== "auto" && entitlements.limits.automationTier < 2
        ? "auto"
        : body.executionMode;
  }
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
