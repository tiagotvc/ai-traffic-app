export type GoogleTableKind = "campaigns" | "adGroups" | "ads";

export const GOOGLE_PERFORMANCE_COLUMNS = [
  "impressions", "clicks", "cost", "conversions", "ctr", "averageCpc",
  "conversionRate", "costPerConversion", "conversionValue", "valuePerConversion", "roas"
] as const;

export type GooglePerformanceColumn = (typeof GOOGLE_PERFORMANCE_COLUMNS)[number];
export type GoogleTableColumnId = "status" | "channelType" | "type" | GooglePerformanceColumn;

export const GOOGLE_TABLE_DEFAULTS: Record<GoogleTableKind, GoogleTableColumnId[]> = {
  campaigns: ["status", "channelType", "impressions", "clicks", "cost", "conversions", "ctr", "averageCpc"],
  adGroups: ["status", "impressions", "clicks", "cost", "conversions", "ctr", "averageCpc"],
  ads: ["status", "type", "impressions", "clicks", "cost", "conversions", "ctr", "averageCpc"]
};

const ATTRIBUTES: Record<GoogleTableKind, GoogleTableColumnId[]> = {
  campaigns: ["status", "channelType"],
  adGroups: ["status"],
  ads: ["status", "type"]
};

export function googleTableAvailableColumns(kind: GoogleTableKind): GoogleTableColumnId[] {
  return [...ATTRIBUTES[kind], ...GOOGLE_PERFORMANCE_COLUMNS];
}

export function normalizeGoogleTableColumns(kind: GoogleTableKind, raw: unknown): GoogleTableColumnId[] {
  if (!Array.isArray(raw)) return [...GOOGLE_TABLE_DEFAULTS[kind]];
  const valid = new Set(googleTableAvailableColumns(kind));
  const columns = [...new Set(raw.filter((v): v is GoogleTableColumnId => typeof v === "string" && valid.has(v as GoogleTableColumnId)))];
  return columns.length ? columns : [...GOOGLE_TABLE_DEFAULTS[kind]];
}

export function googleDerivedMetrics<T extends { clicks: number; cost: number; conversions: number; conversionValue?: number }>(row: T) {
  const conversionValue = row.conversionValue ?? 0;
  return {
    ...row,
    conversionRate: row.clicks > 0 ? row.conversions / row.clicks : 0,
    costPerConversion: row.conversions > 0 ? row.cost / row.conversions : 0,
    conversionValue,
    valuePerConversion: row.conversions > 0 ? conversionValue / row.conversions : 0,
    roas: row.cost > 0 ? conversionValue / row.cost : 0
  };
}
