import {
  columnRefKey,
  resolveColumnNumericValue,
  type MetricRowData,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { evaluateFormula } from "@/lib/metric-formula";

export type SortDir = "asc" | "desc";

export function compareRowsByColumn<T extends MetricRowData>(
  col: TableColumnRef | "name" | "client",
  dir: SortDir,
  a: T & { campaignName?: string; clientName?: string },
  b: T & { campaignName?: string; clientName?: string },
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>
): number {
  if (col === "name") {
    const cmp = (a.campaignName ?? "").localeCompare(b.campaignName ?? "", undefined, {
      sensitivity: "base"
    });
    return dir === "asc" ? cmp : -cmp;
  }
  if (col === "client") {
    const cmp = (a.clientName ?? "").localeCompare(b.clientName ?? "", undefined, {
      sensitivity: "base"
    });
    return dir === "asc" ? cmp : -cmp;
  }

  const aVal = resolveColumnNumericValue(col, a, customMetrics, evaluateFormula) ?? 0;
  const bVal = resolveColumnNumericValue(col, b, customMetrics, evaluateFormula) ?? 0;
  return dir === "asc" ? aVal - bVal : bVal - aVal;
}

export function sortRowsByKey<T extends MetricRowData>(
  rows: T[],
  sortKey: string | null,
  sortDir: SortDir,
  metricColumns: TableColumnRef[],
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>
): T[] {
  if (!sortKey) return rows;

  if (sortKey === "name" || sortKey === "client") {
    return [...rows].sort((a, b) =>
      compareRowsByColumn(sortKey, sortDir, a, b, customMetrics)
    );
  }

  const col = metricColumns.find((c) => columnRefKey(c) === sortKey);
  if (!col) return rows;

  return [...rows].sort((a, b) => compareRowsByColumn(col, sortDir, a, b, customMetrics));
}
