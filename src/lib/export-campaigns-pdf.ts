"use client";

import {
  buildCampaignPdfFilename,
  buildCampaignTablePdf,
  downloadPdfBytes,
  type CampaignPdfLabels,
  type CampaignPdfRow
} from "@/lib/export/campaign-table-pdf";
import { columnRefKey, type TableColumnRef } from "@/lib/campaign-table-layout";
import type { MetricKey } from "@/lib/dashboard-metrics";

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

/** Metrics kept in compact PDF exports (full labels, no truncation). */
export const PDF_ESSENTIAL_METRIC_KEYS: MetricKey[] = ["spend", "clicks", "cpc", "ctr"];

const PDF_MAX_COLUMNS = 7;

function filterEssentialMetricColumns(
  metricColumns: TableColumnRef[],
  metricColumnLabels?: string[]
): { columns: TableColumnRef[]; labels: string[] | undefined } {
  const labelByKey = new Map<string, string>();
  metricColumns.forEach((col, i) => {
    labelByKey.set(columnRefKey(col), metricColumnLabels?.[i] ?? "");
  });

  const picked: TableColumnRef[] = [];
  for (const key of PDF_ESSENTIAL_METRIC_KEYS) {
    const col = metricColumns.find((c) => c.kind === "metric" && c.key === key);
    if (col) picked.push(col);
  }

  if (picked.length === 0) {
    const fallback = metricColumns.slice(0, 4);
    return {
      columns: fallback,
      labels: metricColumnLabels?.slice(0, fallback.length)
    };
  }

  return {
    columns: picked,
    labels: picked.map((col) => labelByKey.get(columnRefKey(col)) ?? "")
  };
}

export function preparePdfExportColumns(input: {
  metricColumns: TableColumnRef[];
  metricColumnLabels?: string[];
  /** Drafts and other tables without metrics stay portrait with type column. */
  forcePortrait?: boolean;
}): {
  metricColumns: TableColumnRef[];
  metricColumnLabels: string[] | undefined;
  includeTypeColumn: boolean;
  landscape: boolean;
} {
  const { metricColumns, metricColumnLabels, forcePortrait } = input;

  let columns = metricColumns;
  let labels = metricColumnLabels;
  let includeTypeColumn = true;

  const totalWithType = 4 + columns.length;
  if (totalWithType > PDF_MAX_COLUMNS) {
    includeTypeColumn = false;
    const essential = filterEssentialMetricColumns(columns, labels);
    columns = essential.columns;
    labels = essential.labels;
  }

  const totalCols = (includeTypeColumn ? 4 : 3) + columns.length;
  const landscape = !forcePortrait && totalCols > PDF_MAX_COLUMNS;

  if (landscape && totalCols > PDF_MAX_COLUMNS) {
    const maxMetrics = PDF_MAX_COLUMNS - (includeTypeColumn ? 4 : 3);
    columns = columns.slice(0, Math.max(1, maxMetrics));
    labels = labels?.slice(0, columns.length);
  }

  return {
    metricColumns: columns,
    metricColumnLabels: labels,
    includeTypeColumn,
    landscape
  };
}

export async function exportCampaignGroupPdf({
  groupLabel,
  rows,
  metricColumns,
  customMetrics,
  filename,
  locale = typeof navigator !== "undefined" && navigator.language.startsWith("en") ? "en" : "pt-BR",
  labels,
  brandName,
  clientLabel,
  clientSlug,
  metricColumnLabels
}: {
  groupLabel: string;
  rows: CampaignPdfRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, CustomMetricDef>;
  filename?: string;
  locale?: string;
  labels: CampaignPdfLabels;
  brandName?: string;
  clientLabel?: string;
  clientSlug?: string;
  metricColumnLabels?: string[];
}) {
  if (!rows.length) {
    throw new Error("NO_DATA");
  }

  const pdfColumns = preparePdfExportColumns({
    metricColumns,
    metricColumnLabels,
    forcePortrait: metricColumns.length === 0
  });

  const bytes = await buildCampaignTablePdf({
    groupLabel,
    rows,
    metricColumns: pdfColumns.metricColumns,
    customMetrics,
    labels,
    locale,
    brandName,
    clientLabel,
    metricColumnLabels: pdfColumns.metricColumnLabels,
    includeTypeColumn: pdfColumns.includeTypeColumn,
    landscape: pdfColumns.landscape
  });

  const resolvedFilename =
    filename ??
    buildCampaignPdfFilename({
      groupLabel,
      clientSlug
    });

  downloadPdfBytes(bytes, resolvedFilename);
}
