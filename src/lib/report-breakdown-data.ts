import "server-only";

import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import {
  fetchInsightsWithBreakdownsForRange,
  pickConversions,
  pickResults,
  type InsightBreakdownType,
  type MetaBreakdownInsightRow
} from "@/lib/meta-graph";

export type ReportBreakdownType = "gender" | "age" | "device";

export type ReportBreakdownRow = {
  value: string;
  label: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  sharePct: number;
  cpa: number | null;
};

export type ReportBreakdownSection = {
  type: ReportBreakdownType;
  rows: ReportBreakdownRow[];
  totalSpend: number;
};

const BREAKDOWN_FIELDS: Array<{ field: InsightBreakdownType; type: ReportBreakdownType }> = [
  { field: "gender", type: "gender" },
  { field: "age", type: "age" },
  { field: "device_platform", type: "device" }
];

const GENDER_LABELS: Record<string, { pt: string; en: string }> = {
  male: { pt: "Masculino", en: "Male" },
  female: { pt: "Feminino", en: "Female" },
  unknown: { pt: "Desconhecido", en: "Unknown" }
};

const DEVICE_LABELS: Record<string, { pt: string; en: string }> = {
  mobile_app: { pt: "Mobile (app)", en: "Mobile app" },
  mobile_web: { pt: "Mobile (web)", en: "Mobile web" },
  desktop: { pt: "Desktop", en: "Desktop" },
  unknown: { pt: "Desconhecido", en: "Unknown" }
};

function breakdownValue(row: MetaBreakdownInsightRow, field: InsightBreakdownType): string {
  if (field === "device_platform") return String(row.device_platform ?? "unknown");
  if (field === "gender") return String(row.gender ?? "unknown");
  if (field === "age") return String(row.age ?? "unknown");
  return String(row.region ?? "unknown");
}

function labelFor(type: ReportBreakdownType, value: string, locale: string): string {
  const lang = locale.startsWith("en") ? "en" : "pt";
  if (type === "gender") return GENDER_LABELS[value]?.[lang] ?? value;
  if (type === "device") return DEVICE_LABELS[value]?.[lang] ?? value.replace(/_/g, " ");
  return value;
}

function ageSortKey(value: string): number {
  const match = value.match(/^(\d+)/);
  return match ? Number(match[1]) : 999;
}

function sortRows(type: ReportBreakdownType, rows: ReportBreakdownRow[]): ReportBreakdownRow[] {
  if (type === "age") {
    return [...rows].sort((a, b) => ageSortKey(a.value) - ageSortKey(b.value));
  }
  return [...rows].sort((a, b) => b.spend - a.spend);
}

function aggregateBreakdown(
  rows: MetaBreakdownInsightRow[],
  field: InsightBreakdownType,
  type: ReportBreakdownType,
  locale: string
): ReportBreakdownSection {
  const aggregated = new Map<
    string,
    { spend: number; conversions: number; clicks: number; impressions: number }
  >();

  for (const row of rows) {
    const value = breakdownValue(row, field);
    if (!value || value === "unknown") continue;
    const spend = Number(row.spend ?? 0);
    const conversions = pickConversions(row.actions) || pickResults(row) || 0;
    const clicks = Number(row.clicks ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const prev = aggregated.get(value) ?? { spend: 0, conversions: 0, clicks: 0, impressions: 0 };
    aggregated.set(value, {
      spend: prev.spend + spend,
      conversions: prev.conversions + conversions,
      clicks: prev.clicks + clicks,
      impressions: prev.impressions + impressions
    });
  }

  const totalSpend = [...aggregated.values()].reduce((sum, row) => sum + row.spend, 0);
  const breakdownRows: ReportBreakdownRow[] = [...aggregated.entries()].map(([value, agg]) => ({
    value,
    label: labelFor(type, value, locale),
    spend: agg.spend,
    conversions: agg.conversions,
    clicks: agg.clicks,
    impressions: agg.impressions,
    sharePct: totalSpend > 0 ? (agg.spend / totalSpend) * 100 : 0,
    cpa: agg.conversions > 0 ? agg.spend / agg.conversions : null
  }));

  return {
    type,
    rows: sortRows(type, breakdownRows),
    totalSpend
  };
}

async function fetchBreakdownSection(
  accessToken: string,
  metaAdAccountId: string,
  since: string,
  until: string,
  field: InsightBreakdownType,
  type: ReportBreakdownType,
  locale: string
): Promise<ReportBreakdownSection | null> {
  try {
    const rows = await fetchInsightsWithBreakdownsForRange(
      accessToken,
      metaAdAccountId,
      [field],
      since,
      until
    );
    const section = aggregateBreakdown(rows, field, type, locale);
    return section.rows.length ? section : null;
  } catch {
    return null;
  }
}

export async function loadReportBreakdowns(input: {
  tenantId: string;
  metaAdAccountId: string;
  since: string;
  until: string;
  locale: string;
  accessToken?: string;
}): Promise<ReportBreakdownSection[]> {
  const tokens = input.accessToken ? [input.accessToken] : await getAllTenantMetaTokens(input.tenantId);
  if (!tokens.length) return [];

  for (const token of tokens) {
    const sections: ReportBreakdownSection[] = [];
    for (const { field, type } of BREAKDOWN_FIELDS) {
      const section = await fetchBreakdownSection(
        token,
        input.metaAdAccountId,
        input.since,
        input.until,
        field,
        type,
        input.locale
      );
      if (section) sections.push(section);
    }
    if (sections.length) return sections;
  }

  return [];
}
