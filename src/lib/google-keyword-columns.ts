export const GOOGLE_KEYWORD_COLUMN_IDS = [
  "matchType",
  "status",
  "campaignName",
  "adGroupName",
  "impressions",
  "clicks",
  "cost",
  "ctr",
  "averageCpc",
  "conversions",
  "conversionRate",
  "costPerConversion",
  "conversionValue",
  "valuePerConversion",
  "allConversions",
  "searchImpressionShare",
  "searchTopImpressionShare",
  "searchAbsoluteTopImpressionShare",
  "topImpressionPercentage",
  "absoluteTopImpressionPercentage"
] as const;

export type GoogleKeywordColumnId = (typeof GOOGLE_KEYWORD_COLUMN_IDS)[number];

export const DEFAULT_GOOGLE_KEYWORD_COLUMNS: GoogleKeywordColumnId[] = [
  "matchType",
  "status",
  "adGroupName",
  "impressions",
  "clicks",
  "cost",
  "conversions",
  "ctr",
  "averageCpc"
];

const VALID = new Set<string>(GOOGLE_KEYWORD_COLUMN_IDS);

export function normalizeGoogleKeywordColumns(value: unknown): GoogleKeywordColumnId[] {
  if (!Array.isArray(value)) return [...DEFAULT_GOOGLE_KEYWORD_COLUMNS];
  const unique = [...new Set(value.filter((item): item is GoogleKeywordColumnId => typeof item === "string" && VALID.has(item)))];
  return unique.length ? unique.slice(0, 20) : [...DEFAULT_GOOGLE_KEYWORD_COLUMNS];
}
