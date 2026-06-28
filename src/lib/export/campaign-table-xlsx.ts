"use client";

import { computeGroupTotals } from "@/lib/campaign-group-totals";
import {
  columnRefKey,
  resolveColumnNumericValue,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { evaluateFormula } from "@/lib/metric-formula";
import {
  hexToArgb,
  resolveExportAccentColor,
  type CampaignExportBranding
} from "@/lib/export/campaign-export-branding";
import {
  EXPORT_DRAFT_CATEGORY,
  groupCampaignRowsByCategory,
  sanitizeExcelSheetName
} from "@/lib/export/campaign-export-scope";
import type { CampaignPdfRow, CampaignPdfLabels } from "@/lib/export/campaign-table-pdf";
import type { RenderedCampaignChart } from "@/lib/export/campaign-export-charts";
import { downloadBytes } from "@/lib/export/download-bytes";

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

type ExcelJSModule = typeof import("exceljs");

type SheetLabels = {
  all: string;
  draft: string;
  charts: string;
  chartData: string;
  resolvePreset: (key: string) => string;
};

async function loadExcelJS(): Promise<ExcelJSModule> {
  return import("exceljs");
}

function statusLabel(status: string | undefined, labels: CampaignPdfLabels): string {
  if (status === "ACTIVE") return labels.statusActive;
  if (status === "PAUSED") return labels.statusPaused;
  if (status === "DRAFT") return labels.statusDraft;
  return labels.statusInactive;
}

function metricColumnLabel(
  col: TableColumnRef,
  customNames: Record<string, string>
): string {
  if (col.kind === "metric") return col.key.toUpperCase();
  if (col.kind === "custom") return customNames[col.id] ?? col.id;
  if (col.kind === "meta_action") return col.actionType;
  return col.id;
}

function rawCellValue(
  col: TableColumnRef,
  row: CampaignPdfRow,
  customMetrics: Record<string, CustomMetricDef>
): number | null {
  return resolveColumnNumericValue(col, row, customMetrics, evaluateFormula);
}

function excelNumFmt(col: TableColumnRef, customMetrics: Record<string, CustomMetricDef>): string {
  if (col.kind === "metric") {
    const fmt = col.key;
    if (fmt === "spend" || fmt === "cpc" || fmt === "cpm" || fmt === "cpa") return '"R$"#,##0.00';
    if (fmt === "ctr") return "0.00%";
    if (fmt === "roas") return '0.0"x"';
    return "#,##0";
  }
  if (col.kind === "custom") {
    const fmt = customMetrics[col.id]?.format ?? "number";
    if (fmt === "currency") return '"R$"#,##0.00';
    if (fmt === "percent") return "0.00%";
    if (fmt === "multiplier") return '0.0"x"';
  }
  return "#,##0.00";
}

function pctForExcel(col: TableColumnRef, val: number | null): number | null {
  if (val == null) return null;
  if (col.kind === "metric" && col.key === "ctr") return val / 100;
  if (col.kind === "custom") return val;
  return val;
}

function columnLetter(index: number): string {
  let n = index;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

type PopulateSheetInput = {
  sheet: import("exceljs").Worksheet;
  rows: CampaignPdfRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, CustomMetricDef>;
  labels: CampaignPdfLabels;
  locale: string;
  includeTypeColumn: boolean;
  fixedHeaders: string[];
  headers: string[];
  metricLabels: string[];
  customNames: Record<string, string>;
  accentArgb: string;
  reportTitle: string;
  agencyName: string;
  clientLabel?: string;
  branding?: CampaignExportBranding;
  enableAutoFilter?: boolean;
};

function populateCampaignSheet(input: PopulateSheetInput) {
  const {
    sheet,
    rows,
    metricColumns,
    customMetrics,
    labels,
    locale,
    includeTypeColumn,
    fixedHeaders,
    headers,
    customNames,
    accentArgb,
    reportTitle,
    agencyName,
    clientLabel,
    branding,
    enableAutoFilter = true
  } = input;

  const HEADER_FILL = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF1E293B" }
  };
  const TOTALS_FILL = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFEDE9FE" }
  };
  const ALT_FILL = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFF5F3FF" }
  };
  const ROW_FILL = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFF8FAFC" }
  };

  const headerRowNumber = branding?.footerContact?.trim() ? 5 : 4;

  const generatedAt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell(1, 1).value = reportTitle;
  sheet.getCell(1, 1).font = { size: 16, bold: true, color: { argb: "FF0F172A" } };
  sheet.getCell(1, 1).alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, headers.length);
  const metaParts = [
    agencyName !== reportTitle ? agencyName : undefined,
    labels.campaignsCount(rows.length),
    labels.periodLabel,
    clientLabel ? labels.clientScope(clientLabel) : undefined,
    generatedAt
  ].filter(Boolean);
  sheet.getCell(2, 1).value = metaParts.join(" · ");
  sheet.getCell(2, 1).font = { size: 10, color: { argb: "FF64748B" } };
  sheet.getCell(2, 1).alignment = { horizontal: "center" };

  if (branding?.footerContact?.trim()) {
    sheet.mergeCells(3, 1, 3, headers.length);
    sheet.getCell(3, 1).value = branding.footerContact.trim();
    sheet.getCell(3, 1).font = { size: 9, color: { argb: "FF64748B" } };
    sheet.getCell(3, 1).alignment = { horizontal: "center" };
  }

  sheet.addRow([]);
  const headerRow = sheet.getRow(headerRowNumber);
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFF8FAFC" }, size: 10 };
    cell.alignment = { horizontal: i >= fixedHeaders.length ? "right" : "left", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: accentArgb } }
    };
  });
  headerRow.height = 22;

  rows.forEach((row, rowIndex) => {
    const dataRow = sheet.addRow([
      row.campaignName,
      row.clientName,
      statusLabel(row.status, labels),
      ...(includeTypeColumn
        ? [campaignPresetCode(row.preset, customNames[row.preset ?? ""])]
        : []),
      ...metricColumns.map((col) => rawCellValue(col, row, customMetrics))
    ]);

    const fill = rowIndex % 2 === 1 ? ALT_FILL : ROW_FILL;
    dataRow.eachCell((cell) => {
      cell.fill = fill;
    });

    metricColumns.forEach((col, colIndex) => {
      const cell = dataRow.getCell(fixedHeaders.length + colIndex + 1);
      const val = pctForExcel(col, rawCellValue(col, row, customMetrics));
      if (val != null) {
        cell.numFmt = excelNumFmt(col, customMetrics);
      }
      cell.alignment = { horizontal: "right" };
    });
  });

  const totals = computeGroupTotals(rows, metricColumns, customMetrics);
  const totalsRow = sheet.addRow([
    `${labels.total} (${rows.length})`,
    "",
    "",
    ...(includeTypeColumn ? [""] : []),
    ...metricColumns.map((col) => totals[columnRefKey(col)])
  ]);
  totalsRow.eachCell((cell, colNumber) => {
    cell.fill = TOTALS_FILL;
    cell.font = { bold: true, color: { argb: "FF0F172A" } };
    if (colNumber > fixedHeaders.length) {
      cell.alignment = { horizontal: "right" };
      const col = metricColumns[colNumber - fixedHeaders.length - 1];
      if (col) {
        const val = pctForExcel(col, totals[columnRefKey(col)]);
        if (val != null) cell.numFmt = excelNumFmt(col, customMetrics);
      }
    }
  });

  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 0 ? 34 : i === 1 ? 22 : i < fixedHeaders.length ? 14 : 16;
  });

  if (enableAutoFilter && rows.length > 0) {
    const lastCol = columnLetter(headers.length);
    sheet.autoFilter = `A${headerRowNumber}:${lastCol}${headerRowNumber}`;
  }

  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
}

export async function buildCampaignTableXlsx(input: {
  groupLabel: string;
  rows: CampaignPdfRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, CustomMetricDef>;
  labels: CampaignPdfLabels;
  locale?: string;
  brandName?: string;
  clientLabel?: string;
  metricColumnLabels?: string[];
  includeTypeColumn?: boolean;
  charts?: RenderedCampaignChart[];
  branding?: CampaignExportBranding;
  sheetLabels?: SheetLabels;
}): Promise<Uint8Array> {
  const excelModule = await loadExcelJS();
  const ExcelJS = (excelModule as { default?: ExcelJSModule }).default ?? excelModule;
  const locale = input.locale ?? "pt-BR";
  const includeTypeColumn = input.includeTypeColumn ?? true;
  const accentHex = resolveExportAccentColor(input.branding?.accentColor);
  const accentArgb = hexToArgb(accentHex);
  const reportTitle = input.branding?.reportTitle?.trim() || input.groupLabel;
  const agencyName =
    input.branding?.agencyName?.trim() ||
    input.branding?.brandName?.trim() ||
    input.brandName ||
    "Orion Agency";

  const customNames = Object.fromEntries(
    Object.entries(input.customMetrics).map(([id, m]) => [id, m.name])
  );

  const metricLabels =
    input.metricColumnLabels ??
    input.metricColumns.map((col) => metricColumnLabel(col, customNames));

  const fixedHeaders = [
    input.labels.campaign,
    input.labels.client,
    input.labels.status,
    ...(includeTypeColumn ? [input.labels.type] : [])
  ];
  const headers = [...fixedHeaders, ...metricLabels];

  const sheetLabels = input.sheetLabels ?? {
    all: "Todas",
    draft: "Rascunho",
    charts: "Gráficos",
    chartData: "Dados p/ gráficos",
    resolvePreset: (key: string) => key
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = agencyName;
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();

  function addCategorySheet(name: string, rows: CampaignPdfRow[]) {
    if (!rows.length) return;
    let sheetName = sanitizeExcelSheetName(name);
    let suffix = 2;
    while (usedSheetNames.has(sheetName)) {
      const base = sanitizeExcelSheetName(name).slice(0, 28);
      sheetName = sanitizeExcelSheetName(`${base} ${suffix}`);
      suffix += 1;
    }
    usedSheetNames.add(sheetName);

    const sheet = workbook.addWorksheet(sheetName);
    populateCampaignSheet({
      sheet,
      rows,
      metricColumns: input.metricColumns,
      customMetrics: input.customMetrics,
      labels: input.labels,
      locale,
      includeTypeColumn,
      fixedHeaders,
      headers,
      metricLabels,
      customNames,
      accentArgb,
      reportTitle,
      agencyName,
      clientLabel: input.clientLabel,
      branding: input.branding
    });
  }

  addCategorySheet(sheetLabels.all, input.rows);

  for (const group of groupCampaignRowsByCategory(input.rows)) {
    const label =
      group.key === EXPORT_DRAFT_CATEGORY
        ? sheetLabels.draft
        : sheetLabels.resolvePreset(group.key);
    addCategorySheet(label, group.rows);
  }

  const validCharts = (input.charts ?? []).filter(
    (c) => c.dataUrl && c.dataUrl.startsWith("data:image/png")
  );

  if (validCharts.length) {
    const chartSheet = workbook.addWorksheet(sanitizeExcelSheetName(sheetLabels.charts));
    chartSheet.getCell(1, 1).value = input.labels.chartsSectionTitle ?? sheetLabels.charts;
    chartSheet.getCell(1, 1).font = { color: { argb: accentArgb }, bold: true };

    let rowCursor = 3;
    for (const chart of validCharts) {
      chartSheet.getCell(rowCursor, 1).value = chart.title;
      chartSheet.getCell(rowCursor, 1).font = { bold: true, size: 12 };
      rowCursor += 1;

      try {
        const imageId = workbook.addImage({
          base64: chart.dataUrl.replace(/^data:image\/png;base64,/, ""),
          extension: "png"
        });
        chartSheet.addImage(imageId, {
          tl: { col: 0, row: rowCursor - 1 },
          ext: { width: 640, height: 280 }
        });
      } catch {
        /* skip broken chart image */
      }
      rowCursor += 18;
    }

    const dataSheet = workbook.addWorksheet(sanitizeExcelSheetName(sheetLabels.chartData));
    dataSheet.addRow(["Campanha", "Investimento", "ROAS"]);
    dataSheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }
      };
      cell.font = { bold: true, color: { argb: "FFF8FAFC" } };
    });
    input.rows.forEach((row, i) => {
      const r = dataSheet.addRow([row.campaignName, row.spend ?? 0, row.roas ?? 0]);
      if (i % 2 === 1) {
        r.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F3FF" }
          };
        });
      }
      r.getCell(2).numFmt = '"R$"#,##0.00';
      r.getCell(3).numFmt = '0.0"x"';
    });
    dataSheet.getColumn(1).width = 36;
    dataSheet.getColumn(2).width = 16;
    dataSheet.getColumn(3).width = 12;
    dataSheet.autoFilter = "A1:C1";
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function buildCampaignXlsxFilename(input: {
  groupLabel: string;
  clientSlug?: string;
  date?: Date;
}): string {
  const date = input.date ?? new Date();
  const datePart = date.toISOString().slice(0, 10);
  const clientPart = (input.clientSlug || "todos")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const groupPart = input.groupLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `campanhas-${clientPart}-${groupPart}-${datePart}.xlsx`;
}

export function downloadXlsxBytes(bytes: Uint8Array, filename: string) {
  downloadBytes(
    bytes,
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}
