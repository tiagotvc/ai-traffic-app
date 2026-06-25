import type {
  TableBlockConfig,
  TableColumnDef,
  TableColumnFormat,
  TableColumnFormula,
  TableTextAlign
} from "@/lib/dashboard/app-block-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

export function normalizeTableColumnDefs(config: Partial<TableBlockConfig>): TableColumnDef[] {
  if (config.columnDefs?.length) return config.columnDefs;
  return (config.columns ?? ["spend", "roas"]).map((key) => ({
    id: key,
    kind: "metric" as const,
    metricKey: key,
    format: "auto" as const
  }));
}

export function metricsRequiredForColumns(defs: TableColumnDef[]): MetricKey[] {
  const keys = new Set<MetricKey>();
  for (const col of defs) {
    if (col.kind === "metric" && col.metricKey) keys.add(col.metricKey);
    if (col.kind === "calculated" && col.formula) {
      for (const k of formulaMetricKeys(col.formula)) keys.add(k);
    }
  }
  return Array.from(keys);
}

export function formulaMetricKeys(formula: TableColumnFormula): MetricKey[] {
  switch (formula.kind) {
    case "divide":
    case "ratio_percent":
      return [formula.numerator, formula.denominator];
    case "multiply":
    case "subtract":
      return [formula.left, formula.right];
    case "custom":
      return parseExpressionMetricKeys(formula.expression);
    default:
      return [];
  }
}

export function parseExpressionMetricKeys(expression: string): MetricKey[] {
  const found: MetricKey[] = [];
  for (const m of METRIC_CATALOG) {
    if (new RegExp(`\\b${m.key}\\b`).test(expression)) found.push(m.key);
  }
  return found;
}

export function evaluateColumnValue(
  col: TableColumnDef,
  metrics: Partial<Record<MetricKey, number>>
): number | null {
  if (col.kind === "metric" && col.metricKey) {
    return metrics[col.metricKey] ?? 0;
  }
  if (col.kind === "calculated" && col.formula) {
    return evaluateFormula(col.formula, metrics);
  }
  return null;
}

export function evaluateFormula(
  formula: TableColumnFormula,
  metrics: Partial<Record<MetricKey, number>>
): number | null {
  const n = (k: MetricKey) => metrics[k] ?? 0;
  switch (formula.kind) {
    case "divide": {
      const d = n(formula.denominator);
      return d === 0 ? null : n(formula.numerator) / d;
    }
    case "ratio_percent": {
      const d = n(formula.denominator);
      return d === 0 ? null : (n(formula.numerator) / d) * 100;
    }
    case "multiply":
      return n(formula.left) * n(formula.right);
    case "subtract":
      return n(formula.left) - n(formula.right);
    case "custom":
      return evaluateCustomExpression(formula.expression, metrics);
    default:
      return null;
  }
}

function evaluateCustomExpression(
  expression: string,
  metrics: Partial<Record<MetricKey, number>>
): number | null {
  let expr = expression.trim();
  if (!expr) return null;

  for (const m of METRIC_CATALOG) {
    const val = metrics[m.key] ?? 0;
    expr = expr.replace(new RegExp(`\\b${m.key}\\b`, "g"), String(val));
  }

  if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;

  try {
    const result = Function(`"use strict"; return (${expr})`)() as unknown;
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function formatColumnDisplay(
  col: TableColumnDef,
  value: number | null,
  formatMetric: (key: MetricKey, value: number) => string
): string {
  if (value === null || Number.isNaN(value)) return "—";

  const format = col.format ?? "auto";
  if (format === "auto" && col.kind === "metric" && col.metricKey) {
    return formatMetric(col.metricKey, value);
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    case "percent":
      return `${value.toFixed(col.decimals ?? 1)}%`;
    case "integer":
      return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(value));
    case "decimal":
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: col.decimals ?? 2,
        maximumFractionDigits: col.decimals ?? 2
      }).format(value);
    case "number":
      return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: col.decimals ?? 2 }).format(value);
    default:
      if (col.kind === "metric" && col.metricKey) return formatMetric(col.metricKey, value);
      return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: col.decimals ?? 2 }).format(value);
  }
}

export function columnLabel(
  col: TableColumnDef,
  tMetrics: (key: string) => string
): string {
  if (col.label?.trim()) return col.label.trim();
  if (col.kind === "metric" && col.metricKey) return tMetrics(col.metricKey);
  if (col.kind === "calculated" && col.formula) {
    switch (col.formula.kind) {
      case "divide":
        return `${tMetrics(col.formula.numerator)} ÷ ${tMetrics(col.formula.denominator)}`;
      case "ratio_percent":
        return `${tMetrics(col.formula.numerator)} / ${tMetrics(col.formula.denominator)} %`;
      case "multiply":
        return `${tMetrics(col.formula.left)} × ${tMetrics(col.formula.right)}`;
      case "subtract":
        return `${tMetrics(col.formula.left)} − ${tMetrics(col.formula.right)}`;
      case "custom":
        return col.formula.expression;
    }
  }
  return col.id;
}

export function resolveSortColumnId(config: Partial<TableBlockConfig>): string {
  if (config.sortColumnId) return config.sortColumnId;
  if (config.sortColumn === "name") return "name";
  if (config.sortColumn) return String(config.sortColumn);
  return "roas";
}

export function sortRows<T extends { name: string; metrics?: Partial<Record<MetricKey, number>>; computed?: Record<string, number> }>(
  rows: T[],
  columnDefs: TableColumnDef[],
  sortColumnId: string,
  direction: "asc" | "desc"
): T[] {
  const dir = direction === "asc" ? 1 : -1;
  const col = columnDefs.find((c) => c.id === sortColumnId);

  return [...rows].sort((a, b) => {
    if (sortColumnId === "name") {
      return dir * a.name.localeCompare(b.name);
    }
    const av =
      col && a.computed?.[col.id] !== undefined
        ? a.computed[col.id]!
        : col
          ? evaluateColumnValue(col, a.metrics ?? {}) ?? 0
          : a.metrics?.[sortColumnId as MetricKey] ?? 0;
    const bv =
      col && b.computed?.[col.id] !== undefined
        ? b.computed[col.id]!
        : col
          ? evaluateColumnValue(col, b.metrics ?? {}) ?? 0
          : b.metrics?.[sortColumnId as MetricKey] ?? 0;
    return dir * (av - bv);
  });
}

export function columnAlign(col: TableColumnDef, fallback: TableTextAlign): TableTextAlign {
  return col.align ?? fallback;
}

export function createMetricColumn(metricKey: MetricKey): TableColumnDef {
  return { id: metricKey, kind: "metric", metricKey, format: "auto" };
}

export function createCalculatedColumn(
  partial: Omit<TableColumnDef, "id" | "kind"> & { formula: TableColumnFormula }
): TableColumnDef {
  return {
    id: `calc-${Date.now()}`,
    kind: "calculated",
    format: partial.format ?? "decimal",
    ...partial
  };
}

export function patchTableColumnDefs(
  config: TableBlockConfig,
  defs: TableColumnDef[]
): Partial<TableBlockConfig> {
  return {
    columnDefs: defs,
    columns: metricsRequiredForColumns(defs)
  };
}
