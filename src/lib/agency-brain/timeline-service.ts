import "server-only";

import type { ClientTimelineEvent } from "@/db/entities/ClientTimelineEvent";
import { repositories } from "@/db/repositories";
import type { TimelineEventDto, TimelineEventType } from "@/lib/agency-brain/domain/schemas";

export type RecordTimelineEventInput = {
  type: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceId?: string | null;
  sourceType?: string | null;
};

export type TimelineFilters = {
  type?: TimelineEventType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function toTimelineEventDto(row: ClientTimelineEvent): TimelineEventDto {
  return {
    id: row.id,
    clientId: row.clientId,
    type: row.type,
    title: row.title,
    description: row.description ?? null,
    metadata: (row.metadata as TimelineEventDto["metadata"]) ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

export async function recordTimelineEvent(
  tenantId: string,
  clientId: string,
  input: RecordTimelineEventInput
): Promise<TimelineEventDto> {
  const { clientTimelineEvent: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    metadata: input.metadata ?? null,
    sourceId: input.sourceId ?? null,
    sourceType: input.sourceType ?? null
  });
  const saved = await repo.save(row);
  return toTimelineEventDto(saved);
}

export async function listClientTimeline(
  tenantId: string,
  clientId: string,
  filters: TimelineFilters = {}
): Promise<{ items: TimelineEventDto[]; total: number; page: number; pageSize: number }> {
  const { clientTimelineEvent: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 30;

  const qb = repo
    .createQueryBuilder("e")
    .where("e.tenantId = :tenantId", { tenantId })
    .andWhere("e.clientId = :clientId", { clientId });

  if (filters.type) {
    qb.andWhere("e.type = :type", { type: filters.type });
  }
  if (filters.dateFrom) {
    qb.andWhere("e.createdAt >= :dateFrom", { dateFrom: filters.dateFrom });
  }
  if (filters.dateTo) {
    qb.andWhere("e.createdAt <= :dateTo", { dateTo: filters.dateTo });
  }

  const total = await qb.getCount();
  const rows = await qb
    .orderBy("e.createdAt", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  return { items: rows.map(toTimelineEventDto), total, page, pageSize };
}
