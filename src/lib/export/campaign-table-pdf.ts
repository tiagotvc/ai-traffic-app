"use client";

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

import { computeGroupTotals } from "@/lib/campaign-group-totals";
import {
  columnRefKey,
  resolveColumnNumericValue,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import { evaluateFormula } from "@/lib/metric-formula";
import { sanitizePdfText, truncatePdfText, wrapPdfText } from "@/lib/export/pdf-text";

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 36;
const HEADER_FONT_SIZE = 9;
const DATA_FONT_SIZE = 8.5;
const ROW_HEIGHT = 14;
const HEADER_LINE_HEIGHT = 10;
const HEADER_PAD_Y = 5;
const FOOTER_Y = 24;
const COMPACT_HEADER_HEIGHT = 72;
const FULL_HEADER_HEIGHT = 88;

const C = {
  headerBg: rgb(0.059, 0.09, 0.165),
  accent: rgb(0.961, 0.651, 0.137),
  textLight: rgb(0.945, 0.961, 0.976),
  textMuted: rgb(0.58, 0.639, 0.722),
  textDark: rgb(0.059, 0.09, 0.165),
  tableHeadBg: rgb(0.118, 0.161, 0.231),
  tableHeadText: rgb(0.796, 0.835, 0.882),
  rowAlt: rgb(0.973, 0.98, 0.988),
  rowBorder: rgb(0.886, 0.906, 0.941),
  totalsBg: rgb(0.945, 0.961, 0.976),
  totalsText: rgb(0.059, 0.09, 0.165)
};

export type CampaignPdfRow = {
  campaignName: string;
  clientName: string;
  status?: string;
  preset?: string;
  spend: number;
  conversions: number;
  leads: number;
  roas: number;
  cpa: number | null;
  cpl: number | null;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  [key: string]: unknown;
};

export type CampaignPdfLabels = {
  campaign: string;
  client: string;
  status: string;
  type: string;
  total: string;
  pageOf: (page: number, total: number) => string;
  statusActive: string;
  statusPaused: string;
  statusInactive: string;
  statusDraft: string;
  campaignsCount: (n: number) => string;
  clientScope: (client: string) => string;
  allClients: string;
};

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

type PageSize = { w: number; h: number };

type TableLayout = {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  pageSize: PageSize;
  contentWidth: number;
  colWidths: number[];
  headers: string[];
  headerLines: string[][];
  tableHeaderHeight: number;
  metricStartIndex: number;
};

function pageSize(landscape: boolean): PageSize {
  return landscape ? { w: A4.h, h: A4.w } : A4;
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

function columnWeight(index: number, includeTypeColumn: boolean, metricCount: number): number {
  if (index === 0) return 0.28;
  if (index === 1) return 0.16;
  if (index === 2) return 0.1;
  if (includeTypeColumn && index === 3) return 0.08;
  return metricCount > 0 ? 0.38 / metricCount : 0.1;
}

function normalizeWidths(raw: number[], contentWidth: number): number[] {
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) return raw.map(() => contentWidth / raw.length);
  const scaled = raw.map((w) => (w / sum) * contentWidth);
  const rounded = scaled.map((w) => Math.floor(w * 100) / 100);
  const drift = contentWidth - rounded.reduce((a, b) => a + b, 0);
  rounded[rounded.length - 1]! += drift;
  return rounded;
}

function computeColumnWidths(
  headers: string[],
  fontBold: PDFFont,
  contentWidth: number,
  includeTypeColumn: boolean,
  metricCount: number
): number[] {
  const raw = headers.map((_, i) => contentWidth * columnWeight(i, includeTypeColumn, metricCount));
  const widths = normalizeWidths(raw, contentWidth);

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < headers.length; i++) {
      const inner = Math.max(24, widths[i]! - 8);
      const lines = wrapPdfText(
        headers[i]!,
        inner,
        (line) => fontBold.widthOfTextAtSize(line, HEADER_FONT_SIZE)
      );
      const maxLineWidth = Math.max(
        ...lines.map((line) => fontBold.widthOfTextAtSize(line, HEADER_FONT_SIZE)),
        0
      );
      const needed = maxLineWidth + 8;
      if (needed > widths[i]!) {
        widths[i] = needed;
      }
    }
    const sum = widths.reduce((a, b) => a + b, 0);
    if (sum > contentWidth) {
      return normalizeWidths(
        headers.map((_, i) => columnWeight(i, includeTypeColumn, metricCount)),
        contentWidth
      );
    }
  }

  return normalizeWidths(widths, contentWidth);
}

function buildHeaderLines(
  headers: string[],
  colWidths: number[],
  fontBold: PDFFont
): { lines: string[][]; height: number } {
  const lines = headers.map((header, i) =>
    wrapPdfText(
      header,
      Math.max(20, colWidths[i]! - 8),
      (line) => fontBold.widthOfTextAtSize(line, HEADER_FONT_SIZE)
    )
  );
  const maxLines = Math.max(1, ...lines.map((l) => l.length));
  const height = HEADER_PAD_Y * 2 + maxLines * HEADER_LINE_HEIGHT;
  return { lines, height: Math.max(18, height) };
}

function maxCharsForWidth(width: number, fontSize: number): number {
  return Math.max(6, Math.floor(width / (fontSize * 0.5)));
}

function drawPageFooter(
  page: PDFPage,
  font: PDFFont,
  pageSize: PageSize,
  pageNum: number,
  pageTotal: number,
  label: string
) {
  page.drawText(sanitizePdfText(label), {
    x: MARGIN,
    y: FOOTER_Y,
    size: 8,
    font,
    color: C.textMuted
  });
  const pageText = sanitizePdfText(`${pageNum}/${pageTotal}`);
  const textWidth = font.widthOfTextAtSize(pageText, 8);
  page.drawText(pageText, {
    x: pageSize.w - MARGIN - textWidth,
    y: FOOTER_Y,
    size: 8,
    font,
    color: C.textMuted
  });
}

function drawCoverHeader(
  page: PDFPage,
  pageSize: PageSize,
  font: PDFFont,
  fontBold: PDFFont,
  compact: boolean,
  input: {
    brandName?: string;
    groupLabel: string;
    clientLabel: string;
    generatedAt: string;
    countLabel: string;
    clientScopeLabel?: string;
  }
): number {
  const headerHeight = compact ? COMPACT_HEADER_HEIGHT : FULL_HEADER_HEIGHT;
  page.drawRectangle({
    x: 0,
    y: pageSize.h - headerHeight,
    width: pageSize.w,
    height: headerHeight,
    color: C.headerBg
  });
  page.drawRectangle({
    x: 0,
    y: pageSize.h - headerHeight,
    width: pageSize.w,
    height: 3,
    color: C.accent
  });

  let y = pageSize.h - (compact ? 22 : 28);
  if (input.brandName) {
    page.drawText(truncatePdfText(input.brandName, 56), {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: C.accent
    });
    y -= compact ? 12 : 14;
  }

  page.drawText(truncatePdfText(input.groupLabel, 72), {
    x: MARGIN,
    y,
    size: compact ? 14 : 16,
    font: fontBold,
    color: C.textLight
  });
  y -= compact ? 14 : 16;

  if (input.clientScopeLabel) {
    page.drawText(truncatePdfText(input.clientScopeLabel, 96), {
      x: MARGIN,
      y,
      size: 8.5,
      font,
      color: C.textMuted
    });
    y -= 11;
  }

  page.drawText(truncatePdfText(`${input.countLabel} · ${input.generatedAt}`, 110), {
    x: MARGIN,
    y,
    size: 8,
    font,
    color: C.textMuted
  });

  return pageSize.h - headerHeight - 12;
}

function drawTableHeaderRow(layout: TableLayout) {
  const { page, fontBold, y, colWidths, contentWidth, headerLines, tableHeaderHeight } = layout;
  page.drawRectangle({
    x: MARGIN,
    y: y - tableHeaderHeight + 4,
    width: contentWidth,
    height: tableHeaderHeight,
    color: C.tableHeadBg
  });

  let x = MARGIN + 4;
  for (let i = 0; i < headerLines.length; i++) {
    const lines = headerLines[i]!;
    const lineCount = lines.length;
    const blockHeight = lineCount * HEADER_LINE_HEIGHT;
    const topY = y - HEADER_PAD_Y - HEADER_LINE_HEIGHT + (tableHeaderHeight - blockHeight) / 2;

    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x,
        y: topY - lineIndex * HEADER_LINE_HEIGHT,
        size: HEADER_FONT_SIZE,
        font: fontBold,
        color: C.tableHeadText
      });
    });
    x += colWidths[i]!;
  }
}

function drawDataRow(
  layout: TableLayout,
  cells: string[],
  opts?: { bold?: boolean; bg?: typeof C.rowAlt | typeof C.totalsBg }
) {
  const { page, font, fontBold, y, colWidths, metricStartIndex } = layout;
  const rowFont = opts?.bold ? fontBold : font;
  const bg = opts?.bg;

  if (bg) {
    page.drawRectangle({
      x: MARGIN,
      y: y - ROW_HEIGHT + 3,
      width: layout.contentWidth,
      height: ROW_HEIGHT,
      color: bg
    });
  }

  let x = MARGIN + 4;
  for (let i = 0; i < cells.length; i++) {
    const alignRight = i >= metricStartIndex;
    const innerWidth = colWidths[i]! - 8;
    const raw = cells[i] ?? "";
    const text =
      alignRight || i === 2
        ? sanitizePdfText(raw)
        : truncatePdfText(raw, maxCharsForWidth(innerWidth, DATA_FONT_SIZE));
    const textWidth = rowFont.widthOfTextAtSize(text, DATA_FONT_SIZE);
    page.drawText(text, {
      x: alignRight ? x + colWidths[i]! - textWidth - 4 : x,
      y: y - 10,
      size: DATA_FONT_SIZE,
      font: rowFont,
      color: opts?.bold ? C.totalsText : C.textDark
    });
    x += colWidths[i]!;
  }

  page.drawLine({
    start: { x: MARGIN, y: y - ROW_HEIGHT + 2 },
    end: { x: MARGIN + layout.contentWidth, y: y - ROW_HEIGHT + 2 },
    thickness: 0.4,
    color: C.rowBorder
  });
}

function buildTableRows(
  rows: CampaignPdfRow[],
  metricColumns: TableColumnRef[],
  customMetrics: Record<string, CustomMetricDef>,
  labels: CampaignPdfLabels,
  locale: string,
  customNames: Record<string, string>,
  includeTypeColumn: boolean
): string[][] {
  return rows.map((row) => {
    const metrics = metricColumns.map((col) => formatCellValue(col, row, customMetrics, locale));
    const fixed = [
      row.campaignName,
      row.clientName,
      statusLabel(row.status, labels)
    ];
    if (includeTypeColumn) {
      fixed.push(campaignPresetCode(row.preset, customNames[row.preset ?? ""]));
    }
    return [...fixed, ...metrics];
  });
}

function buildTotalsRow(
  rows: CampaignPdfRow[],
  metricColumns: TableColumnRef[],
  customMetrics: Record<string, CustomMetricDef>,
  labels: CampaignPdfLabels,
  locale: string,
  includeTypeColumn: boolean
): string[] {
  const totals = computeGroupTotals(rows, metricColumns, customMetrics);
  const metricCells = metricColumns.map((col) => {
    const val = totals[columnRefKey(col)];
    if (val == null) return "—";
    if (col.kind === "metric") return formatMetricValue(col.key, val, locale);
    if (col.kind === "custom") {
      const fmt = customMetrics[col.id]?.format ?? "number";
      if (fmt === "currency") return formatBRL(val, locale);
      if (fmt === "percent") return formatPercent(val, 2, locale);
      if (fmt === "multiplier") return formatRoas(val, locale);
      return String(Math.round(val * 100) / 100);
    }
    return String(val);
  });
  const fixed = [`${labels.total} (${rows.length})`];
  const emptyCount = includeTypeColumn ? 3 : 2;
  for (let i = 0; i < emptyCount; i++) fixed.push("");
  return [...fixed, ...metricCells];
}

export async function buildCampaignTablePdf(input: {
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
  landscape?: boolean;
}): Promise<Uint8Array> {
  const locale = input.locale ?? "pt-BR";
  const includeTypeColumn = input.includeTypeColumn ?? true;
  const landscape = input.landscape ?? false;
  const size = pageSize(landscape);
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
  const metricStartIndex = fixedHeaders.length;

  const dataRows = buildTableRows(
    input.rows,
    input.metricColumns,
    input.customMetrics,
    input.labels,
    locale,
    customNames,
    includeTypeColumn
  );
  const totalsRow = buildTotalsRow(
    input.rows,
    input.metricColumns,
    input.customMetrics,
    input.labels,
    locale,
    includeTypeColumn
  );
  const allRows = [...dataRows, totalsRow];

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = size.w - MARGIN * 2;
  const colWidths = computeColumnWidths(
    headers,
    fontBold,
    contentWidth,
    includeTypeColumn,
    input.metricColumns.length
  );
  const { lines: headerLines, height: tableHeaderHeight } = buildHeaderLines(
    headers,
    colWidths,
    fontBold
  );

  const generatedAt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const countLabel = input.labels.campaignsCount(input.rows.length);
  const clientScopeLabel = input.clientLabel
    ? input.labels.clientScope(input.clientLabel)
    : undefined;
  const compactHeader = allRows.length <= 8;

  const headerBlockHeight = compactHeader ? COMPACT_HEADER_HEIGHT : FULL_HEADER_HEIGHT;
  const usableHeightFirst =
    size.h - headerBlockHeight - MARGIN - FOOTER_Y - tableHeaderHeight - 16;
  const usableHeightNext = size.h - 28 - MARGIN - tableHeaderHeight - FOOTER_Y - 12;
  const rowsPerFirstPage = Math.max(1, Math.floor(usableHeightFirst / ROW_HEIGHT));
  const rowsPerNextPage = Math.max(1, Math.floor(usableHeightNext / ROW_HEIGHT));

  const pageChunks: string[][][] = [];
  let idx = 0;
  if (allRows.length > 0) {
    pageChunks.push(allRows.slice(idx, idx + rowsPerFirstPage));
    idx += rowsPerFirstPage;
    while (idx < allRows.length) {
      pageChunks.push(allRows.slice(idx, idx + rowsPerNextPage));
      idx += rowsPerNextPage;
    }
  } else {
    pageChunks.push([]);
  }

  const pageTotal = pageChunks.length;

  for (let pageIndex = 0; pageIndex < pageChunks.length; pageIndex++) {
    const page = doc.addPage([size.w, size.h]);
    const isFirst = pageIndex === 0;
    const startY = isFirst
      ? drawCoverHeader(page, size, font, fontBold, compactHeader, {
          brandName: input.brandName,
          groupLabel: input.groupLabel,
          clientLabel: input.clientLabel ?? input.labels.allClients,
          generatedAt,
          countLabel,
          clientScopeLabel
        })
      : size.h - 28 - tableHeaderHeight;

    if (!isFirst) {
      page.drawRectangle({
        x: 0,
        y: size.h - 24,
        width: size.w,
        height: 24,
        color: C.headerBg
      });
      page.drawText(truncatePdfText(input.groupLabel, 90), {
        x: MARGIN,
        y: size.h - 16,
        size: 9,
        font: fontBold,
        color: C.textLight
      });
    }

    const layout: TableLayout = {
      page,
      font,
      fontBold,
      y: startY,
      pageSize: size,
      contentWidth,
      colWidths,
      headers,
      headerLines,
      tableHeaderHeight,
      metricStartIndex
    };

    drawTableHeaderRow(layout);
    layout.y -= tableHeaderHeight + 4;

    const chunk = pageChunks[pageIndex]!;
    for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
      const cells = chunk[rowIndex]!;
      const isTotals = pageIndex === pageChunks.length - 1 && rowIndex === chunk.length - 1;
      drawDataRow(layout, cells, {
        bold: isTotals,
        bg: isTotals ? C.totalsBg : rowIndex % 2 === 1 ? C.rowAlt : undefined
      });
      layout.y -= ROW_HEIGHT;
    }

    drawPageFooter(
      page,
      font,
      size,
      pageIndex + 1,
      pageTotal,
      input.labels.pageOf(pageIndex + 1, pageTotal)
    );
  }

  return doc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildCampaignPdfFilename(input: {
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
  return `campanhas-${clientPart}-${groupPart}-${datePart}.pdf`;
}
