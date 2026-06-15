import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { listAdminPlans } from "@/lib/billing/admin-plans";
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
  allowLiveMeta: z.boolean()
});

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: apenas letras minúsculas, números e hífen"),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  priceMonthlyCents: z.number().int().min(0).optional(),
  priceYearlyCents: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
  isActive: z.boolean().optional(),
  limits: limitsSchema.optional()
});

const DEFAULT_NEW_LIMITS: PlanLimits = {
  maxClients: 5,
  maxAdAccounts: 10,
  maxMembers: 2,
  maxAutomationRules: 3,
  maxAiRequestsPerMonth: 30,
  maxScheduledReports: 1,
  allowAutoSync: true,
  allowLiveMeta: false
};

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const plans = await listAdminPlans();
  return NextResponse.json({ ok: true, plans });
}

export async function POST(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const body = createSchema.parse(await req.json());
    const { plan: planRepo } = await repositories();

    const existing = await planRepo.findOne({ where: { slug: body.slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug já existe" }, { status: 409 });
    }

    const maxSort = await planRepo
      .createQueryBuilder("p")
      .select("MAX(p.sortOrder)", "max")
      .getRawOne<{ max: string | null }>();

    const plan = planRepo.create({
      slug: body.slug,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      priceMonthlyCents: body.priceMonthlyCents ?? 0,
      priceYearlyCents: body.priceYearlyCents ?? 0,
      trialDays: body.trialDays ?? 0,
      sortOrder: body.sortOrder ?? (Number(maxSort?.max ?? 0) + 1),
      isActive: body.isActive ?? false,
      limits: body.limits ?? DEFAULT_NEW_LIMITS,
      externalPrices: null,
      currency: "USD"
    });

    await planRepo.save(plan);
    return NextResponse.json({ ok: true, plan: planToAdminJson(plan) }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
