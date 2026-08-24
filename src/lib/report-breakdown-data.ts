import "server-only";

import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { isDemoAdAccountId } from "@/lib/demo-data";
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

/** Divisões fixas por conta demo — a Meta não tem esses dados para `act_demo_*`. */
const DEMO_SPLITS: Record<ReportBreakdownType, Array<{ value: string; share: number; convLift: number }>> = {
  gender: [
    { value: "female", share: 0.61, convLift: 1.12 },
    { value: "male", share: 0.36, convLift: 0.82 },
    { value: "unknown", share: 0.03, convLift: 0.6 }
  ],
  age: [
    { value: "18-24", share: 0.14, convLift: 0.72 },
    { value: "25-34", share: 0.33, convLift: 1.16 },
    { value: "35-44", share: 0.29, convLift: 1.2 },
    { value: "45-54", share: 0.16, convLift: 0.94 },
    { value: "55-64", share: 0.08, convLift: 0.66 }
  ],
  device: [
    { value: "mobile_app", share: 0.71, convLift: 1.06 },
    { value: "mobile_web", share: 0.2, convLift: 0.92 },
    { value: "desktop", share: 0.09, convLift: 0.78 }
  ]
};

/** Desloca as fatias por conta para que os clientes demo não fiquem idênticos. */
function demoJitter(seed: string, index: number): number {
  let h = 2166136261;
  const key = `${seed}:${index}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 0.9 + ((h >>> 0) % 200) / 1000; // 0.90 .. 1.10
}

async function buildDemoBreakdowns(input: {
  metaAdAccountId: string;
  since: string;
  until: string;
  locale: string;
}): Promise<ReportBreakdownSection[]> {
  const { adAccount: adAccountRepo, metricSnapshot: metricRepo } = await repositories();
  const acc = await adAccountRepo.findOne({ where: { metaAdAccountId: input.metaAdAccountId } });
  if (!acc) return [];

  const rows = await metricRepo.find({
    where: { adAccountId: acc.id, day: Between(input.since.slice(0, 10), input.until.slice(0, 10)) }
  });
  if (!rows.length) return [];

  const total = rows.reduce(
    (t, r) => ({
      spend: t.spend + (Number(r.spend) || 0),
      conversions: t.conversions + (Number(r.conversions) || 0),
      clicks: t.clicks + (Number(r.clicks) || 0),
      impressions: t.impressions + (Number(r.impressions) || 0)
    }),
    { spend: 0, conversions: 0, clicks: 0, impressions: 0 }
  );
  if (total.spend <= 0) return [];

  return (Object.keys(DEMO_SPLITS) as ReportBreakdownType[]).map((type) => {
    const split = DEMO_SPLITS[type].map((s, i) => ({
      ...s,
      share: s.share * demoJitter(input.metaAdAccountId + type, i)
    }));
    const shareSum = split.reduce((sum, s) => sum + s.share, 0);
    // Conversões seguem a fatia de gasto ponderada pela eficiência do segmento.
    const convWeightSum = split.reduce((sum, s) => sum + s.share * s.convLift, 0);

    const breakdownRows: ReportBreakdownRow[] = split.map((s) => {
      const share = s.share / shareSum;
      const spend = total.spend * share;
      const conversions = Math.round(
        (total.conversions * (s.share * s.convLift)) / convWeightSum
      );
      return {
        value: s.value,
        label: labelFor(type, s.value, input.locale),
        spend,
        conversions,
        clicks: Math.round(total.clicks * share),
        impressions: Math.round(total.impressions * share),
        sharePct: share * 100,
        cpa: conversions > 0 ? spend / conversions : null
      };
    });

    return { type, rows: sortRows(type, breakdownRows), totalSpend: total.spend };
  });
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
  if (isDemoAdAccountId(input.metaAdAccountId)) {
    return buildDemoBreakdowns(input);
  }

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
