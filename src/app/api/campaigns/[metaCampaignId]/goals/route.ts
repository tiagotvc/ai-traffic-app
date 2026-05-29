import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { entityToGoalFields, goalFieldsToEntity } from "@/lib/goal-types";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().uuid(),
  maxCpl: z.number().nullable().optional(),
  maxCpa: z.number().nullable().optional(),
  maxCpc: z.number().nullable().optional(),
  minCtr: z.number().nullable().optional(),
  minRoas: z.number().nullable().optional(),
  maxSpendWithoutConversion: z.number().nullable().optional(),
  budgetAlertPercent: z.number().nullable().optional(),
  windowDays: z.number().int().min(1).max(30).nullable().optional(),
  enabled: z.boolean().optional()
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  if (!clientIdParam) {
    return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
  }

  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientIdParam);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const { campaignGoal: goalRepo } = await repositories();
  const goal = await goalRepo.findOne({ where: { clientId: client.id, metaCampaignId } });

  return NextResponse.json({
    ok: true,
    goals: goal ? entityToGoalFields(goal) : null
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const { campaignGoal: goalRepo } = await repositories();
  let goal = await goalRepo.findOne({ where: { clientId: client.id, metaCampaignId } });
  if (!goal) {
    goal = goalRepo.create({
      clientId: client.id,
      adAccountId: body.adAccountId,
      metaCampaignId,
      enabled: true
    });
  }

  Object.assign(goal, goalFieldsToEntity(body));
  goal.adAccountId = body.adAccountId;
  await goalRepo.save(goal);

  return NextResponse.json({ ok: true, goals: entityToGoalFields(goal) });
}
