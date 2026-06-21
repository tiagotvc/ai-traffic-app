import "server-only";

import { repositories } from "@/db/repositories";
import {
  applyConfidenceScoreSort,
  applyCreatedAtSort,
  applyImpactSort,
  applyUpdatedAtSort
} from "@/lib/agency-brain/list-sort";
import { toLearningDto } from "@/lib/agency-brain/client-learning-service";
import type { LearningDto, LearningFilters } from "@/lib/agency-brain/types";
import { slugify } from "@/lib/app-context";

export type AgencyLearningDto = LearningDto & {
  clientName: string;
  clientSlug: string;
};

export async function listAgencyLearnings(
  tenantId: string,
  filters: LearningFilters = {}
): Promise<{ items: AgencyLearningDto[]; total: number; page: number; pageSize: number }> {
  const { clientLearning: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir = filters.sortDir ?? "desc";
  const view = filters.view ?? "library";

  const qb = repo
    .createQueryBuilder("l")
    .innerJoin("clients", "c", 'c.id = l."clientId" AND c."tenantId" = l."tenantId"')
    .where('l."tenantId" = :tenantId', { tenantId });

  if (view === "shelf") {
    qb.andWhere("l.status IN (:...shelfStatuses)", { shelfStatuses: ["SUGGESTED", "APPROVED"] });
  } else {
    qb.andWhere("l.status = :approved", { approved: "APPROVED" });
  }

  if (filters.category) qb.andWhere("l.category = :category", { category: filters.category });
  if (filters.impact) qb.andWhere("l.impact = :impact", { impact: filters.impact });
  if (filters.confidence) qb.andWhere("l.confidence = :confidence", { confidence: filters.confidence });
  if (filters.source) qb.andWhere("l.source = :source", { source: filters.source });

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    qb.andWhere("(l.title ILIKE :q OR l.description ILIKE :q OR c.name ILIKE :q)", { q });
  }

  if (filters.tags?.length) {
    qb.andWhere("l.tags ?| array[:...tags]", { tags: filters.tags });
  }

  const total = await qb.getCount();

  if (sortBy === "confidenceScore") {
    applyConfidenceScoreSort(qb, "l", sortDir);
  } else if (sortBy === "impact") {
    if (view === "shelf") {
      qb.orderBy("CASE WHEN l.status = 'SUGGESTED' THEN 0 ELSE 1 END", "ASC");
      qb.addOrderBy(
        "CASE l.impact WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END",
        sortDir.toUpperCase() as "ASC" | "DESC"
      );
    } else {
      applyImpactSort(qb, "l", sortDir);
    }
  } else if (sortBy === "updatedAt") {
    applyUpdatedAtSort(qb, "l", sortDir);
  } else {
    applyCreatedAtSort(qb, "l", sortDir);
  }

  const rows = await qb
    .addSelect("c.name", "clientName")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getRawAndEntities();

  const items: AgencyLearningDto[] = rows.entities.map((row, i) => {
    const raw = rows.raw[i] as { clientName?: string };
    const clientName = raw.clientName ?? "Cliente";
    return {
      ...toLearningDto(row),
      clientName,
      clientSlug: clientName !== "Cliente" ? slugify(clientName) : ""
    };
  });

  return { items, total, page, pageSize };
}

export async function countAgencyLearnings(tenantId: string): Promise<number> {
  const { clientLearning: repo } = await repositories();
  return repo.count({ where: { tenantId, status: "APPROVED" } });
}
