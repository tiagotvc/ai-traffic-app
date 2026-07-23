import "server-only";

import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getBreakdown, type GoogleAdsBreakdownDimension } from "@/lib/google-ads-api";
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
  unknown: { pt: "Não informado", en: "Not specified" }
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
    if (!value) continue;
    if (value === "unknown" && type !== "gender") continue;
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

const GOOGLE_DEVICE_LABELS: Record<string, { pt: string; en: string }> = {
  MOBILE: { pt: "Celular", en: "Mobile" },
  DESKTOP: { pt: "Desktop", en: "Desktop" },
  TABLET: { pt: "Tablet", en: "Tablet" },
  CONNECTED_TV: { pt: "TV conectada", en: "Connected TV" },
  OTHER: { pt: "Outro", en: "Other" }
};
const GOOGLE_GENDER_LABELS: Record<string, { pt: string; en: string }> = {
  MALE: { pt: "Masculino", en: "Male" },
  FEMALE: { pt: "Feminino", en: "Female" },
  UNDETERMINED: { pt: "Não determinado", en: "Undetermined" }
};

function googleAgeShort(raw: string): string {
  const t = raw.replace("AGE_RANGE_", "");
  if (t === "UNDETERMINED") return "?";
  return t.replace("_UP", "+").replace("_", "-");
}

function googleValueLabel(
  type: ReportBreakdownType,
  raw: string,
  locale: string
): { value: string; label: string } {
  const lang = locale.startsWith("en") ? "en" : "pt";
  if (type === "device") return { value: raw, label: GOOGLE_DEVICE_LABELS[raw]?.[lang] ?? raw };
  if (type === "gender") return { value: raw, label: GOOGLE_GENDER_LABELS[raw]?.[lang] ?? raw };
  const short = googleAgeShort(raw);
  return { value: short, label: short };
}

/**
 * Breakdowns demográficos do relatório a partir do Google Ads (device/gênero/idade).
 * Fallback para clientes Google-only (sem conta Meta). Só leitura.
 */
export async function loadGoogleReportBreakdowns(input: {
  tenantId: string;
  customerId: string;
  since: string;
  until: string;
  locale: string;
}): Promise<ReportBreakdownSection[]> {
  const token = await getWorkspaceGoogleAccessToken(input.tenantId);
  if (!token) return [];

  const dims: Array<{ dim: GoogleAdsBreakdownDimension; type: ReportBreakdownType }> = [
    { dim: "gender", type: "gender" },
    { dim: "age", type: "age" },
    { dim: "device", type: "device" }
  ];

  const sections: ReportBreakdownSection[] = [];
  for (const { dim, type } of dims) {
    try {
      const rows = await getBreakdown(token, input.customerId, dim, {
        since: input.since,
        until: input.until
      });
      if (!rows.length) continue;
      const totalSpend = rows.reduce((s, r) => s + r.cost, 0);
      const brRows: ReportBreakdownRow[] = rows.map((r) => {
        const { value, label } = googleValueLabel(type, r.label, input.locale);
        return {
          value,
          label,
          spend: r.cost,
          conversions: r.conversions,
          clicks: r.clicks,
          impressions: r.impressions,
          sharePct: totalSpend > 0 ? (r.cost / totalSpend) * 100 : 0,
          cpa: r.conversions > 0 ? r.cost / r.conversions : null
        };
      });
      sections.push({ type, rows: sortRows(type, brRows), totalSpend });
    } catch {
      /* ignora dimensão que falhar */
    }
  }
  return sections;
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
