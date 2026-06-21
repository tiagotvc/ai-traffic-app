import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { toHypothesisDto } from "@/lib/agency-brain/hypothesis-service";
import { slugify } from "@/lib/app-context";

export type AgencyHypothesisDto = ReturnType<typeof toHypothesisDto> & {
  clientName: string;
  clientSlug: string;
};

export async function listAgencyHypotheses(
  tenantId: string,
  limit = 8
): Promise<AgencyHypothesisDto[]> {
  const { clientHypothesis: repo, client: clientRepo } = await repositories();

  const rows = await repo
    .createQueryBuilder("h")
    .where('h."tenantId" = :tenantId', { tenantId })
    .andWhere("h.status NOT IN (:...excluded)", { excluded: ["REJECTED", "ARCHIVED"] })
    .orderBy("CASE WHEN h.status = 'SUGGESTED' THEN 0 ELSE 1 END", "ASC")
    .addOrderBy("h.confidenceScore", "DESC", "NULLS LAST")
    .addOrderBy('h."updatedAt"', "DESC")
    .take(limit)
    .getMany();

  if (!rows.length) return [];

  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  const clients = await clientRepo.find({ where: { tenantId, id: In(clientIds) } });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return rows.map((row) => {
    const client = clientMap.get(row.clientId);
    const name = client?.name ?? "Cliente";
    return {
      ...toHypothesisDto(row),
      clientName: name,
      clientSlug: client?.name ? slugify(client.name) : ""
    };
  });
}
