import type { CampaignColumnId } from "@/lib/campaign-table-columns";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type TableColumnRef =
  | { kind: "field"; id: CampaignColumnId }
  | { kind: "metric"; key: MetricKey }
  | { kind: "meta_action"; actionType: string }
  | { kind: "custom"; id: string };

export type CampaignTableLayout = {
  id: string;
  name: string;
  columns: TableColumnRef[];
};

export const DEFAULT_LAYOUT_ID = "default";

export const DEFAULT_CAMPAIGN_TABLE_LAYOUT: CampaignTableLayout = {
  id: DEFAULT_LAYOUT_ID,
  name: "Padrão",
  columns: [
    { kind: "field", id: "status" },
    { kind: "field", id: "campaign" },
    { kind: "field", id: "client" },
    { kind: "metric", key: "spend" },
    { kind: "metric", key: "conversions" },
    { kind: "metric", key: "cpa" },
    { kind: "metric", key: "roas" },
    { kind: "field", id: "alerts" }
  ]
};

export const MAX_TABLE_COLUMNS = 20;

export type MetricRowData = {
  spend?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  cpa?: number | null;
  cpl?: number | null;
  leads?: number;
  roas?: number;
  messages?: number;
  dailyBudget?: number | null;
  actionMetrics?: Record<string, number>;
};

export function columnRefKey(col: TableColumnRef): string {
  switch (col.kind) {
    case "field":
      return `field:${col.id}`;
    case "metric":
      return `metric:${col.key}`;
    case "meta_action":
      return `action:${col.actionType}`;
    case "custom":
      return `custom:${col.id}`;
  }
}

export function isTableColumnRef(v: unknown): v is TableColumnRef {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.kind === "field" && typeof o.id === "string") return true;
  if (o.kind === "metric" && typeof o.key === "string") return true;
  if (o.kind === "meta_action" && typeof o.actionType === "string") return true;
  if (o.kind === "custom" && typeof o.id === "string") return true;
  return false;
}

export function normalizeTableColumnRefs(raw: unknown): TableColumnRef[] {
  if (!Array.isArray(raw)) return [...DEFAULT_CAMPAIGN_TABLE_LAYOUT.columns];
  const out: TableColumnRef[] = [];
  for (const item of raw) {
    if (isTableColumnRef(item)) out.push(item);
  }
  return out.length ? out.slice(0, MAX_TABLE_COLUMNS) : [...DEFAULT_CAMPAIGN_TABLE_LAYOUT.columns];
}

export function repairLayoutColumns(layout: CampaignTableLayout): CampaignTableLayout {
  const metrics = layoutMetricColumns(layout);
  if (metrics.length > 0) return layout;
  const defaultMetrics = layoutMetricColumns(DEFAULT_CAMPAIGN_TABLE_LAYOUT);
  return { ...layout, columns: [...layout.columns, ...defaultMetrics] };
}

export function normalizeCampaignTableLayouts(raw: unknown): CampaignTableLayout[] {
  if (!Array.isArray(raw) || !raw.length) return [{ ...DEFAULT_CAMPAIGN_TABLE_LAYOUT }];
  const out: CampaignTableLayout[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : `layout-${out.length}`;
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Visão";
    const columns = normalizeTableColumnRefs(o.columns);
    out.push(repairLayoutColumns({ id, name, columns }));
  }
  return out.length ? out : [{ ...DEFAULT_CAMPAIGN_TABLE_LAYOUT }];
}

export function metricValueFromRow(row: MetricRowData, key: MetricKey): number {
  switch (key) {
    case "spend":
      return row.spend ?? 0;
    case "impressions":
      return row.impressions ?? 0;
    case "reach":
      return row.reach ?? 0;
    case "frequency":
      return row.frequency ?? 0;
    case "clicks":
      return row.clicks ?? 0;
    case "ctr":
      return row.ctr ?? 0;
    case "cpc":
      return row.cpc ?? 0;
    case "cpm":
      return row.cpm ?? 0;
    case "conversions":
      return row.conversions ?? 0;
    case "cpa":
      return row.cpa ?? 0;
    case "messages":
      return row.messages ?? 0;
    case "cpmsg":
      return (row.messages ?? 0) > 0 ? (row.spend ?? 0) / (row.messages ?? 1) : 0;
    case "roas":
      return row.roas ?? 0;
    default:
      return 0;
  }
}

export function buildFormulaVars(row: MetricRowData): Record<string, number> {
  const vars: Record<string, number> = {
    spend: row.spend ?? 0,
    impressions: row.impressions ?? 0,
    reach: row.reach ?? 0,
    frequency: row.frequency ?? 0,
    clicks: row.clicks ?? 0,
    ctr: row.ctr ?? 0,
    cpc: row.cpc ?? 0,
    cpm: row.cpm ?? 0,
    conversions: row.conversions ?? 0,
    cpa: row.cpa ?? 0,
    cpl: row.cpl ?? 0,
    leads: row.leads ?? 0,
    roas: row.roas ?? 0,
    messages: row.messages ?? 0,
    cpmsg: metricValueFromRow(row, "cpmsg")
  };
  if (row.actionMetrics) {
    for (const [k, v] of Object.entries(row.actionMetrics)) {
      vars[`action_${k.replace(/\./g, "_")}`] = v;
    }
  }
  return vars;
}

export type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

export function resolveColumnNumericValue(
  col: TableColumnRef,
  row: MetricRowData,
  customMetrics: Record<string, CustomMetricDef>,
  evaluateFormula: (formula: string, vars: Record<string, number>) => number | null
): number | null {
  const vars = buildFormulaVars(row);
  switch (col.kind) {
    case "metric":
      return metricValueFromRow(row, col.key);
    case "meta_action":
      return row.actionMetrics?.[col.actionType] ?? null;
    case "custom": {
      const def = customMetrics[col.id];
      if (!def) return null;
      return evaluateFormula(def.formula, vars);
    }
    default:
      return null;
  }
}

export function layoutMetricColumns(layout: CampaignTableLayout): TableColumnRef[] {
  return layout.columns.filter(
    (c) => c.kind === "metric" || c.kind === "meta_action" || c.kind === "custom"
  );
}

export function layoutFieldColumns(layout: CampaignTableLayout): TableColumnRef[] {
  return layout.columns.filter((c) => c.kind === "field");
}
