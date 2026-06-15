import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { planToAdminJson } from "@/lib/billing/plan-serializer";
import type { ExternalPrices, PlanLimits } from "@/lib/billing/types";

const limitsSchema = z.object({
  maxClients: z.number().int().min(0),
  maxAdAccounts: z.number().int().min(0),
  maxMembers: z.number().int().min(0),
  maxAutomationRules: z.number().int().min(0),
  maxAiRequestsPerMonth: z.number().int().min(0),
  maxScheduledReports: z.number().int().min(0),
  allowAutoSync: z.boolean(),
  allowLiveMeta: z.boolean(),
  allowCreativeMemoryAi: z.boolean()
});

const externalPricesSchema = z
  .object({
    asaas: z
      .object({
        monthlyCents: z.number().int().min(0).optional(),
        yearlyCents: z.number().int().min(0).optional()
      })
      .optional(),
    stripe: z
      .object({
        priceIdMonthly: z.string().optional(),
        priceIdYearly: z.string().optional()
      })
      .optional()
  })
  .nullable()
  .optional();

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  priceMonthlyCents: z.number().int().min(0).optional(),
  priceYearlyCents: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
  isActive: z.boolean().optional(),
  limits: limitsSchema.optional(),
  externalPrices: externalPricesSchema
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const { plan: planRepo } = await repositories();
  const plan = await planRepo.findOne({ where: { id } });
  if (!plan) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, plan: planToAdminJson(plan) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const { plan: planRepo } = await repositories();
    const plan = await planRepo.findOne({ where: { id } });
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (body.name !== undefined) plan.name = body.name;
    if (body.description !== undefined) plan.description = body.description;
    if (body.priceMonthlyCents !== undefined) plan.priceMonthlyCents = body.priceMonthlyCents;
    if (body.priceYearlyCents !== undefined) plan.priceYearlyCents = body.priceYearlyCents;
    if (body.trialDays !== undefined) plan.trialDays = body.trialDays;
    if (body.sortOrder !== undefined) plan.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) plan.isActive = body.isActive;
    if (body.limits !== undefined) plan.limits = body.limits as PlanLimits;
    if (body.externalPrices !== undefined) {
      plan.externalPrices = (body.externalPrices ?? null) as ExternalPrices | null;
    }

    await planRepo.save(plan);
    return NextResponse.json({ ok: true, plan: planToAdminJson(plan) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
