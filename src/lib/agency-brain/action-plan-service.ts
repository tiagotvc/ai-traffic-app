import "server-only";

import type { ClientActionPlan } from "@/db/entities/ClientActionPlan";
import type { ClientActionPlanItem } from "@/db/entities/ClientActionPlanItem";
import { repositories } from "@/db/repositories";
import type { ActionPlanDto, ActionPlanItemDto } from "@/lib/agency-brain/domain/schemas";
import { In } from "typeorm";

export type ActionPlanFilters = {
  status?: ClientActionPlan["status"];
  page?: number;
  pageSize?: number;
};

export type CreateActionPlanInput = {
  title?: string;
  suggestionIds?: string[];
};

function toActionPlanItemDto(row: ClientActionPlanItem): ActionPlanItemDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.dueDate ?? null,
    suggestionId: row.suggestionId ?? null
  };
}

async function loadPlanWithItems(
  plan: ClientActionPlan,
  itemRepo: Awaited<ReturnType<typeof repositories>>["clientActionPlanItem"]
): Promise<ActionPlanDto> {
  const items = await itemRepo.find({
    where: { planId: plan.id },
    order: { sortOrder: "ASC", createdAt: "ASC" }
  });

  return {
    id: plan.id,
    clientId: plan.clientId,
    title: plan.title,
    items: items.map(toActionPlanItemDto),
    generatedAt: plan.generatedAt.toISOString()
  };
}

export async function listActionPlans(
  tenantId: string,
  clientId: string,
  filters: ActionPlanFilters = {}
): Promise<{ items: ActionPlanDto[]; total: number; page: number; pageSize: number }> {
  const { clientActionPlan: planRepo, clientActionPlanItem: itemRepo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;

  const where: Record<string, unknown> = { tenantId, clientId };
  if (filters.status) where.status = filters.status;

  const [rows, total] = await planRepo.findAndCount({
    where,
    order: { generatedAt: "DESC" },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  const items = await Promise.all(rows.map((plan) => loadPlanWithItems(plan, itemRepo)));
  return { items, total, page, pageSize };
}

export async function getActionPlanById(
  tenantId: string,
  clientId: string,
  planId: string
): Promise<ActionPlanDto | null> {
  const { clientActionPlan: planRepo, clientActionPlanItem: itemRepo } = await repositories();
  const plan = await planRepo.findOne({ where: { id: planId, tenantId, clientId } });
  return plan ? loadPlanWithItems(plan, itemRepo) : null;
}

export async function createActionPlanFromSuggestions(
  tenantId: string,
  clientId: string,
  input: CreateActionPlanInput = {}
): Promise<ActionPlanDto> {
  const { clientActionPlan: planRepo, clientActionPlanItem: itemRepo, clientActionSuggestion: sugRepo } =
    await repositories();

  let suggestions = await sugRepo.find({
    where: {
      tenantId,
      clientId,
      status: "PENDING",
      priority: In(["HIGH", "MEDIUM"])
    },
    order: { createdAt: "DESC" },
    take: 10
  });

  if (input.suggestionIds?.length) {
    suggestions = suggestions.filter((s) => input.suggestionIds!.includes(s.id));
  }

  if (!suggestions.length) {
    suggestions = await sugRepo.find({
      where: { tenantId, clientId, status: "PENDING" },
      order: { createdAt: "DESC" },
      take: 5
    });
  }

  const plan = planRepo.create({
    tenantId,
    clientId,
    title: input.title ?? `Plano de ação — ${new Date().toLocaleDateString("pt-BR")}`,
    generatedAt: new Date(),
    status: "active"
  });
  const savedPlan = await planRepo.save(plan);

  const dueBase = new Date();
  const items: ClientActionPlanItem[] = suggestions.map((sug, index) => {
    const due = new Date(dueBase);
    due.setDate(due.getDate() + index + 1);
    return itemRepo.create({
      planId: savedPlan.id,
      title: sug.title,
      status: "pending",
      dueDate: due.toISOString().slice(0, 10),
      suggestionId: sug.id,
      sortOrder: index
    });
  });

  if (items.length) {
    await itemRepo.save(items);
  }

  return loadPlanWithItems(savedPlan, itemRepo);
}

export async function createManualActionPlan(
  tenantId: string,
  clientId: string,
  title: string,
  itemTitles: string[]
): Promise<ActionPlanDto> {
  const { clientActionPlan: planRepo, clientActionPlanItem: itemRepo } = await repositories();

  const plan = planRepo.create({
    tenantId,
    clientId,
    title,
    generatedAt: new Date(),
    status: "active"
  });
  const savedPlan = await planRepo.save(plan);

  const items = itemTitles.map((itemTitle, index) =>
    itemRepo.create({
      planId: savedPlan.id,
      title: itemTitle,
      status: "pending",
      sortOrder: index
    })
  );

  if (items.length) {
    await itemRepo.save(items);
  }

  return loadPlanWithItems(savedPlan, itemRepo);
}
