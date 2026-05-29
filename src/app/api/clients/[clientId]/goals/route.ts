import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { entityToGoalFields, goalFieldsToEntity } from "@/lib/goal-types";

const BodySchema = z.object({
  objective: z.enum(["leads", "sales", "traffic"]).optional(),
  maxCpl: z.number().nullable().optional(),
  maxCpa: z.number().nullable().optional(),
  maxCpc: z.number().nullable().optional(),
  minCtr: z.number().nullable().optional(),
  minRoas: z.number().nullable().optional(),
  maxSpendWithoutConversion: z.number().nullable().optional(),
  budgetAlertPercent: z.number().nullable().optional(),
  windowDays: z.number().int().min(1).max(30).optional(),
  enabled: z.boolean().optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const { clientGoal: goalRepo } = await repositories();
  let goal = await goalRepo.findOne({ where: { clientId: client.id } });
  if (!goal) {
    goal = await goalRepo.save(
      goalRepo.create({ clientId: client.id, objective: "leads", enabled: false, windowDays: 1 })
    );
  }

  return NextResponse.json({ ok: true, goals: entityToGoalFields(goal), objective: goal.objective });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { clientGoal: goalRepo } = await repositories();

  let goal = await goalRepo.findOne({ where: { clientId: client.id } });
  if (!goal) {
    goal = goalRepo.create({ clientId: client.id, objective: "leads", enabled: true, windowDays: 1 });
  }

  if (body.objective) goal.objective = body.objective;
  Object.assign(goal, goalFieldsToEntity(body));
  await goalRepo.save(goal);

  return NextResponse.json({ ok: true, goals: entityToGoalFields(goal), objective: goal.objective });
}
