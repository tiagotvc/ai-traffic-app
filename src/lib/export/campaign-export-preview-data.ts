import { computeGroupTotals } from "@/lib/campaign-group-totals";
import {
  columnRefKey,
  resolveColumnNumericValue,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { evaluateFormula } from "@/lib/metric-formula";
import type { CampaignPdfLabels, CampaignPdfRow } from "@/lib/export/campaign-table-pdf";
import { resolveExportAccentColor } from "@/lib/export/campaign-export-branding";
import {
  EXPORT_DRAFT_CATEGORY,
  groupCampaignRowsByCategory
} from "@/lib/export/campaign-export-scope";

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

function statusLabel(status: string | undefined, labels: CampaignPdfLabels): string {
  if (status === "ACTIVE") return labels.statusActive;
  if (status === "PAUSED") return labels.statusPaused;
  if (status === "DRAFT") return labels.statusDraft;
  return labels.statusInactive;
}

function formatCellValue(
  col: TableColumnRef,
  row: CampaignPdfRow,
  customMetrics: Record<string, CustomMetricDef>,
  locale: string
): string {
  const val = resolveColumnNumericValue(col, row, customMetrics, evaluateFormula);
  if (val == null) return "—";
  if (col.kind === "metric") return formatMetricValue(col.key, val, locale);
  if (col.kind === "custom") {
    const fmt = customMetrics[col.id]?.format ?? "number";
    if (fmt === "currency") return formatBRL(val, locale);
    if (fmt === "percent") return formatPercent(val, 2, locale);
    if (fmt === "multiplier") return formatRoas(val, locale);
    return String(Math.round(val * 100) / 100);
  }
  return String(Math.round(val));
}

export type CampaignExportPreviewSheet = {
  key: string;
  label: string;
  rowCount: number;
  headers: string[];
  rows: string[][];
  totalsRow: string[];
};

export type CampaignExportPreviewModel = {
  reportTitle: string;
  agencyName?: string;
  logoUrl?: string;
  includeLogo: boolean;
  accentColor: string;
  periodLabel?: string;
  clientScopeLabel?: string;
  generatedAt: string;
  countLabel: string;
  footerContact?: string;
  headers: string[];
  rows: string[][];
  totalsRow: string[];
  chartTitles: string[];
  format: "pdf" | "xlsx";
  metricStartIndex: number;
  sheets?: CampaignExportPreviewSheet[];
  chartSheetLabels?: string[];
};

export function buildCampaignExportPreviewModel(input: {
  format: "pdf" | "xlsx";
  reportTitle: string;
  rows: CampaignPdfRow[];
  metricColumns: TableColumnRef[];
  metricColumnLabels: string[];
  customMetrics: Record<string, CustomMetricDef>;
  labels: CampaignPdfLabels;
  locale: string;
  branding: {
    agencyName?: string;
    logoUrl?: string;
    includeLogo?: boolean;
    accentColor?: string;
    footerContact?: string;
  };
  clientLabel?: string;
  chartTitles?: string[];
  includeTypeColumn?: boolean;
  sheetLabels?: {
    all: string;
    draft: string;
    charts: string;
    chartData: string;
    resolvePreset: (key: string) => string;
  };
}): CampaignExportPreviewModel {
  const locale = input.locale;
  const includeTypeColumn = input.includeTypeColumn ?? true;
  const customNames = Object.fromEntries(
    Object.entries(input.customMetrics).map(([id, m]) => [id, m.name])
  );
  const accentColor = resolveExportAccentColor(input.branding.accentColor);

  const fixedHeaders = [
    input.labels.campaign,
    input.labels.client,
    input.labels.status,
    ...(includeTypeColumn ? [input.labels.type] : [])
  ];
  const headers = [...fixedHeaders, ...input.metricColumnLabels];

  const dataRows = input.rows.map((row) => {
    const metrics = input.metricColumns.map((col) =>
      formatCellValue(col, row, input.customMetrics, locale)
    );
    const fixed = [
      row.campaignName,
      row.clientName,
      statusLabel(row.status, input.labels)
    ];
    if (includeTypeColumn) {
      fixed.push(campaignPresetCode(row.preset, customNames[row.preset ?? ""]));
    }
    return [...fixed, ...metrics];
  });

  function buildTotalsForRows(rows: CampaignPdfRow[]): string[] {
    const totals = computeGroupTotals(rows, input.metricColumns, input.customMetrics);
    const metricCells = input.metricColumns.map((col) => {
      const val = totals[columnRefKey(col)];
      if (val == null) return "—";
      if (col.kind === "metric") return formatMetricValue(col.key, val, locale);
      if (col.kind === "custom") {
        const fmt = input.customMetrics[col.id]?.format ?? "number";
        if (fmt === "currency") return formatBRL(val, locale);
        if (fmt === "percent") return formatPercent(val, 2, locale);
        if (fmt === "multiplier") return formatRoas(val, locale);
        return String(Math.round(val * 100) / 100);
      }
      return String(val);
    });
    return [
      `${input.labels.total} (${rows.length})`,
      ...Array(includeTypeColumn ? 3 : 2).fill(""),
      ...metricCells
    ];
  }

  const totalsRow = buildTotalsForRows(input.rows);

  const generatedAt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const sheets: CampaignExportPreviewSheet[] | undefined =
    input.format === "xlsx" && input.sheetLabels
      ? [
          {
            key: "all",
            label: input.sheetLabels.all,
            rowCount: input.rows.length,
            headers,
            rows: dataRows,
            totalsRow
          },
          ...groupCampaignRowsByCategory(input.rows).map((group) => ({
            key: group.key,
            label:
              group.key === EXPORT_DRAFT_CATEGORY
                ? input.sheetLabels!.draft
                : input.sheetLabels!.resolvePreset(group.key),
            rowCount: group.rows.length,
            headers,
            rows: group.rows.map((row) => {
              const metrics = input.metricColumns.map((col) =>
                formatCellValue(col, row, input.customMetrics, locale)
              );
              const fixed = [
                row.campaignName,
                row.clientName,
                statusLabel(row.status, input.labels)
              ];
              if (includeTypeColumn) {
                fixed.push(campaignPresetCode(row.preset, customNames[row.preset ?? ""]));
              }
              return [...fixed, ...metrics];
            }),
            totalsRow: buildTotalsForRows(group.rows)
          }))
        ]
      : undefined;

  const chartSheetLabels =
    input.format === "xlsx" && input.sheetLabels && (input.chartTitles?.length ?? 0) > 0
      ? [input.sheetLabels.charts, input.sheetLabels.chartData]
      : undefined;

  return {
    reportTitle: input.reportTitle,
    agencyName: input.branding.agencyName,
    logoUrl: input.branding.logoUrl,
    includeLogo: input.branding.includeLogo ?? false,
    accentColor,
    periodLabel: input.labels.periodLabel,
    clientScopeLabel: input.clientLabel
      ? input.labels.clientScope(input.clientLabel)
      : undefined,
    generatedAt,
    countLabel: input.labels.campaignsCount(input.rows.length),
    footerContact: input.branding.footerContact,
    headers,
    rows: dataRows,
    totalsRow,
    chartTitles: input.chartTitles ?? [],
    format: input.format,
    metricStartIndex: fixedHeaders.length,
    sheets,
    chartSheetLabels
  };
}
