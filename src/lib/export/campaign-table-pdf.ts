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
import {
  accentSoftPdfRgb,
  fetchLogoBytes,
  hexToPdfRgb,
  resolveExportAccentColor,
  type CampaignExportBranding
} from "@/lib/export/campaign-export-branding";
import { downloadBytes } from "@/lib/export/download-bytes";
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

const BASE = {
  headerBg: rgb(0.059, 0.09, 0.165),
  textLight: rgb(0.945, 0.961, 0.976),
  textMuted: rgb(0.58, 0.639, 0.722),
  textDark: rgb(0.059, 0.09, 0.165),
  tableHeadBg: rgb(0.118, 0.161, 0.231),
  tableHeadText: rgb(0.945, 0.961, 0.976),
  rowAlt: rgb(0.973, 0.98, 0.988),
  rowAltViolet: rgb(0.965, 0.961, 0.996),
  rowBorder: rgb(0.91, 0.91, 0.94),
  totalsText: rgb(0.059, 0.09, 0.165)
};

function pdfPalette(accentHex: string) {
  const accent = hexToPdfRgb(accentHex);
  return {
    ...BASE,
    accent,
    accentSoft: accentSoftPdfRgb(accentHex)
  };
}

export type CampaignPdfRow = {
  campaignName: string;
  clientName: string;
  status?: string;
  preset?: string;
  isDraft?: boolean;
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
  periodLabel?: string;
  chartsSectionTitle?: string;
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
  colors: ReturnType<typeof pdfPalette>;
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
  label: string,
  footerContact?: string,
  colors = BASE
) {
  const leftText = footerContact
    ? sanitizePdfText(`${footerContact} · ${label}`)
    : sanitizePdfText(label);
  page.drawText(truncatePdfText(leftText, 90), {
    x: MARGIN,
    y: FOOTER_Y,
    size: 8,
    font,
    color: colors.textMuted
  });
  const pageText = sanitizePdfText(`${pageNum}/${pageTotal}`);
  const textWidth = font.widthOfTextAtSize(pageText, 8);
  page.drawText(pageText, {
    x: pageSize.w - MARGIN - textWidth,
    y: FOOTER_Y,
    size: 8,
    font,
    color: colors.textMuted
  });
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  pageWidth: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const safe = sanitizePdfText(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color
  });
}

async function drawCoverHeader(
  doc: PDFDocument,
  page: PDFPage,
  pageSize: PageSize,
  font: PDFFont,
  fontBold: PDFFont,
  compact: boolean,
  input: {
    agencyName?: string;
    groupLabel: string;
    clientLabel: string;
    generatedAt: string;
    countLabel: string;
    clientScopeLabel?: string;
    periodLabel?: string;
    logoUrl?: string;
    includeLogo?: boolean;
  },
  colors: ReturnType<typeof pdfPalette>
): Promise<number> {
  const headerHeight = compact ? COMPACT_HEADER_HEIGHT : FULL_HEADER_HEIGHT;
  page.drawRectangle({
    x: 0,
    y: pageSize.h - headerHeight,
    width: pageSize.w,
    height: headerHeight,
    color: colors.headerBg
  });
  page.drawRectangle({
    x: 0,
    y: pageSize.h - headerHeight,
    width: pageSize.w,
    height: 4,
    color: colors.accent
  });

  let y = pageSize.h - (compact ? 24 : 30);

  if (input.includeLogo && input.logoUrl) {
    const logo = await fetchLogoBytes(input.logoUrl);
    if (logo) {
      try {
        const embedded =
          logo.kind === "jpg" ? await doc.embedJpg(logo.bytes) : await doc.embedPng(logo.bytes);
        const maxLogoH = compact ? 22 : 28;
        const scale = Math.min(maxLogoH / embedded.height, 120 / embedded.width, 1);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;
        page.drawImage(embedded, {
          x: (pageSize.w - drawW) / 2,
          y: y - drawH + 4,
          width: drawW,
          height: drawH
        });
        y -= drawH + (compact ? 8 : 10);
      } catch {
        /* skip broken logo */
      }
    }
  }

  if (input.agencyName) {
    drawCenteredText(page, truncatePdfText(input.agencyName, 56), y, pageSize.w, font, 9, colors.accent);
    y -= compact ? 14 : 16;
  }

  drawCenteredText(
    page,
    truncatePdfText(input.groupLabel, 72),
    y,
    pageSize.w,
    fontBold,
    compact ? 15 : 18,
    colors.textLight
  );
  y -= compact ? 16 : 20;

  if (input.clientScopeLabel) {
    drawCenteredText(
      page,
      truncatePdfText(input.clientScopeLabel, 96),
      y,
      pageSize.w,
      font,
      8.5,
      colors.textMuted
    );
    y -= 12;
  }

  const metaParts = [input.countLabel, input.periodLabel, input.generatedAt].filter(Boolean);
  drawCenteredText(
    page,
    truncatePdfText(metaParts.join(" · "), 120),
    y,
    pageSize.w,
    font,
    8,
    colors.textMuted
  );

  return pageSize.h - headerHeight - 16;
}

function drawTableHeaderRow(layout: TableLayout) {
  const { page, fontBold, y, colWidths, contentWidth, headerLines, tableHeaderHeight, colors } =
    layout;
  page.drawRectangle({
    x: MARGIN,
    y: y - tableHeaderHeight + 4,
    width: contentWidth,
    height: tableHeaderHeight,
    color: colors.tableHeadBg
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
        color: colors.tableHeadText
      });
    });
    x += colWidths[i]!;
  }
}

function drawDataRow(
  layout: TableLayout,
  cells: string[],
  opts?: {
    bold?: boolean;
    bg?: ReturnType<typeof pdfPalette>["rowAlt"] | ReturnType<typeof pdfPalette>["accentSoft"] | ReturnType<typeof pdfPalette>["rowAltViolet"];
    drawBorder?: boolean;
  }
) {
  const { page, font, fontBold, y, colWidths, metricStartIndex, colors } = layout;
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
      color: opts?.bold ? colors.totalsText : colors.textDark
    });
    x += colWidths[i]!;
  }

  if (opts?.drawBorder) {
    page.drawLine({
      start: { x: MARGIN, y: y - ROW_HEIGHT + 2 },
      end: { x: MARGIN + layout.contentWidth, y: y - ROW_HEIGHT + 2 },
      thickness: 0.25,
      color: colors.rowBorder
    });
  }
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
  chartImages?: Array<{ title: string; pngBytes: Uint8Array }>;
  branding?: CampaignExportBranding;
}): Promise<Uint8Array> {
  const locale = input.locale ?? "pt-BR";
  const includeTypeColumn = input.includeTypeColumn ?? true;
  const landscape = input.landscape ?? false;
  const size = pageSize(landscape);
  const accentHex = resolveExportAccentColor(input.branding?.accentColor);
  const colors = pdfPalette(accentHex);
  const reportTitle = input.branding?.reportTitle?.trim() || input.groupLabel;
  const agencyName =
    input.branding?.agencyName?.trim() || input.branding?.brandName?.trim() || input.brandName;
  const footerContact = input.branding?.footerContact?.trim();
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
      ? await drawCoverHeader(doc, page, size, font, fontBold, compactHeader, {
          agencyName,
          groupLabel: reportTitle,
          clientLabel: input.clientLabel ?? input.labels.allClients,
          generatedAt,
          countLabel,
          clientScopeLabel,
          periodLabel: input.labels.periodLabel,
          logoUrl: input.branding?.logoUrl,
          includeLogo: input.branding?.includeLogo
        }, colors)
      : size.h - 28 - tableHeaderHeight;

    if (!isFirst) {
      page.drawRectangle({
        x: 0,
        y: size.h - 24,
        width: size.w,
        height: 24,
        color: colors.headerBg
      });
      page.drawText(truncatePdfText(reportTitle, 90), {
        x: MARGIN,
        y: size.h - 16,
        size: 9,
        font: fontBold,
        color: colors.textLight
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
      metricStartIndex,
      colors
    };

    drawTableHeaderRow(layout);
    layout.y -= tableHeaderHeight + 4;

    const chunk = pageChunks[pageIndex]!;
    for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
      const cells = chunk[rowIndex]!;
      const isTotals = pageIndex === pageChunks.length - 1 && rowIndex === chunk.length - 1;
      drawDataRow(layout, cells, {
        bold: isTotals,
        bg: isTotals
          ? colors.accentSoft
          : rowIndex % 2 === 1
            ? colors.rowAltViolet
            : rowIndex % 2 === 0 && rowIndex > 0
              ? colors.rowAlt
              : undefined
      });
      layout.y -= ROW_HEIGHT;
    }

    drawPageFooter(
      page,
      font,
      size,
      pageIndex + 1,
      pageTotal,
      input.labels.pageOf(pageIndex + 1, pageTotal),
      footerContact,
      colors
    );
  }

  const chartImages = (input.chartImages ?? []).filter((c) => c.pngBytes.byteLength > 0);
  if (chartImages.length > 0) {
    const chartsPerPage = 1;
    const chartPageTotal = Math.ceil(chartImages.length / chartsPerPage);
    const tablePageTotal = pageTotal;
    const combinedTotal = tablePageTotal + chartPageTotal;

    for (let chartPageIndex = 0; chartPageIndex < chartPageTotal; chartPageIndex++) {
      const page = doc.addPage([size.w, size.h]);
      const slice = chartImages.slice(
        chartPageIndex * chartsPerPage,
        chartPageIndex * chartsPerPage + chartsPerPage
      );

      page.drawRectangle({
        x: 0,
        y: size.h - 28,
        width: size.w,
        height: 28,
        color: colors.headerBg
      });
      page.drawRectangle({
        x: 0,
        y: size.h - 28,
        width: size.w,
        height: 3,
        color: colors.accent
      });

      const sectionTitle = input.labels.chartsSectionTitle ?? "Charts";
      drawCenteredText(page, sectionTitle, size.h - 18, size.w, fontBold, 10, colors.textLight);

      let chartY = size.h - 56;
      for (const chart of slice) {
        try {
          const png = await doc.embedPng(chart.pngBytes);
          const maxW = size.w - MARGIN * 2;
          const maxH = (size.h - 96) / chartsPerPage;
          const scale = Math.min(maxW / png.width, maxH / png.height, 1);
          const drawW = png.width * scale;
          const drawH = png.height * scale;
          const x = (size.w - drawW) / 2;
          chartY -= drawH;
          page.drawImage(png, { x, y: chartY, width: drawW, height: drawH });
          chartY -= 12;
        } catch {
          /* skip invalid chart image */
        }
      }

      drawPageFooter(
        page,
        font,
        size,
        tablePageTotal + chartPageIndex + 1,
        combinedTotal,
        input.labels.pageOf(tablePageTotal + chartPageIndex + 1, combinedTotal),
        footerContact,
        colors
      );
    }
  }

  return doc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  downloadBytes(bytes, filename, "application/pdf");
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
