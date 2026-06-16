import type { SelectQueryBuilder } from "typeorm";

export type BrainSortDir = "asc" | "desc";

export function applyCreatedAtSort<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortDir: BrainSortDir
): void {
  qb.orderBy(`${alias}.createdAt`, sortDir.toUpperCase() as "ASC" | "DESC");
}

export function applyConfidenceScoreSort<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortDir: BrainSortDir
): void {
  qb.orderBy(`${alias}.confidenceScore`, sortDir.toUpperCase() as "ASC" | "DESC", "NULLS LAST");
}

export function applyImpactSort<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortDir: BrainSortDir
): void {
  const dir = sortDir.toUpperCase() as "ASC" | "DESC";
  qb.orderBy(
    `CASE ${alias}.impact WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`,
    dir
  );
}

export function applyPrioritySort<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortDir: BrainSortDir
): void {
  const dir = sortDir.toUpperCase() as "ASC" | "DESC";
  qb.orderBy(
    `CASE ${alias}.priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`,
    dir
  );
}
