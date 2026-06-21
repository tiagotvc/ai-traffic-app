import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { toLearningDto } from "@/lib/agency-brain/client-learning-service";
import type { AgencyLearningDto } from "@/lib/agency-brain/agency-learnings-service";
import { slugify } from "@/lib/app-context";

/** Aprendizados acionáveis para a prateleira do dashboard (todos os clientes). */
export async function listDashboardBrainShelf(
  tenantId: string,
  limit = 8
): Promise<AgencyLearningDto[]> {
  const { clientLearning: repo, client: clientRepo } = await repositories();

  const rows = await repo
    .createQueryBuilder("l")
    .where('l."tenantId" = :tenantId', { tenantId })
    .andWhere("l.status NOT IN (:...excluded)", { excluded: ["REJECTED", "ARCHIVED"] })
    .orderBy("CASE WHEN l.status = 'SUGGESTED' THEN 0 ELSE 1 END", "ASC")
    .addOrderBy(
      "CASE l.impact WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END",
      "DESC"
    )
    .addOrderBy('l."updatedAt"', "DESC")
    .take(limit)
    .getMany();

  if (!rows.length) return [];

  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  const clients = await clientRepo.find({
    where: { tenantId, id: In(clientIds) }
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return rows.map((row) => {
    const client = clientMap.get(row.clientId);
    return {
      ...toLearningDto(row),
      clientName: client?.name ?? "Cliente",
      clientSlug: client?.name ? slugify(client.name) : ""
    };
  });
}
