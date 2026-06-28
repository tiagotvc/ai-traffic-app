"use client";

import type { MetricKey } from "@/lib/dashboard-metrics";
import type { TableColumnRef } from "@/lib/campaign-table-layout";
import type { CampaignExportBranding } from "@/lib/export/campaign-export-branding";
import {
  dataUrlToUint8Array,
  renderCampaignExportCharts
} from "@/lib/export/campaign-export-charts";
import { resolveExportRows } from "@/lib/export/campaign-export-scope";
import type { CampaignExportConfig } from "@/lib/export/campaign-export-types";
import {
  buildCampaignPdfFilename,
  buildCampaignTablePdf,
  downloadPdfBytes,
  type CampaignPdfLabels,
  type CampaignPdfRow
} from "@/lib/export/campaign-table-pdf";
import {
  buildCampaignTableXlsx,
  buildCampaignXlsxFilename,
  downloadXlsxBytes
} from "@/lib/export/campaign-table-xlsx";
import { preparePdfExportColumns } from "@/lib/export-campaigns-pdf";

type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

function metricsToColumns(metrics: MetricKey[]): TableColumnRef[] {
  return metrics.map((key) => ({ kind: "metric", key }));
}

function isValidChartDataUrl(dataUrl: string): boolean {
  return Boolean(dataUrl && dataUrl.startsWith("data:image/png;base64,") && dataUrl.length > 40);
}

export async function exportCampaignReport(input: {
  groupLabel: string;
  rows: CampaignPdfRow[];
  config: CampaignExportConfig;
  customMetrics: Record<string, CustomMetricDef>;
  locale?: string;
  labels: CampaignPdfLabels;
  brandName?: string;
  clientLabel?: string;
  clientSlug?: string;
  metricColumnLabels?: string[];
  chartLabels: {
    spendBarTitle: string;
    spendBarSubtitle: string;
    roasLineTitle: string;
    roasLineSubtitle: string;
  };
  branding?: CampaignExportBranding;
  sheetLabels?: {
    all: string;
    draft: string;
    charts: string;
    chartData: string;
    resolvePreset: (key: string) => string;
  };
}) {
  const exportRows = resolveExportRows(input.rows, input.config);
  if (!exportRows.length) {
    throw new Error("NO_DATA");
  }

  const branding: CampaignExportBranding = {
    brandName: input.brandName,
    ...input.branding,
    ...input.config.branding
  };

  const metricColumns = metricsToColumns(input.config.metrics);
  const pdfColumns = preparePdfExportColumns({
    metricColumns,
    metricColumnLabels: input.metricColumnLabels,
    forcePortrait: metricColumns.length === 0
  });

  const charts =
    input.config.charts.length > 0
      ? renderCampaignExportCharts({
          rows: exportRows,
          charts: input.config.charts,
          labels: input.chartLabels
        }).filter((chart) => isValidChartDataUrl(chart.dataUrl))
      : [];

  if (input.config.format === "pdf") {
    const chartImages = charts.map((chart) => ({
      title: chart.title,
      pngBytes: dataUrlToUint8Array(chart.dataUrl)
    }));

    const bytes = await buildCampaignTablePdf({
      groupLabel: input.groupLabel,
      rows: exportRows,
      metricColumns: pdfColumns.metricColumns,
      customMetrics: input.customMetrics,
      labels: input.labels,
      locale: input.locale,
      brandName: input.brandName,
      clientLabel: input.clientLabel,
      metricColumnLabels: pdfColumns.metricColumnLabels,
      includeTypeColumn: pdfColumns.includeTypeColumn,
      landscape: pdfColumns.landscape,
      chartImages,
      branding
    });

    const filename = buildCampaignPdfFilename({
      groupLabel: branding.reportTitle ?? input.groupLabel,
      clientSlug: input.clientSlug
    });
    downloadPdfBytes(bytes, filename);
    return;
  }

  const bytes = await buildCampaignTableXlsx({
    groupLabel: input.groupLabel,
    rows: exportRows,
    metricColumns,
    customMetrics: input.customMetrics,
    labels: input.labels,
    locale: input.locale,
    brandName: input.brandName,
    clientLabel: input.clientLabel,
    metricColumnLabels: input.metricColumnLabels,
    includeTypeColumn: pdfColumns.includeTypeColumn,
    charts,
    branding,
    sheetLabels: input.sheetLabels
  });

  const filename = buildCampaignXlsxFilename({
    groupLabel: branding.reportTitle ?? input.groupLabel,
    clientSlug: input.clientSlug
  });
  downloadXlsxBytes(bytes, filename);
}
