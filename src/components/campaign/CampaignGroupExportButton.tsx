"use client";

import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { exportCampaignGroupPdf } from "@/lib/export-campaigns-pdf";
import type { TableColumnRef } from "@/lib/campaign-table-layout";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";
import { cn } from "@/lib/cn";

type ExportRow = {
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

function resolveMetricColumnLabels(
  metricColumns: TableColumnRef[],
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>,
  t: ReturnType<typeof useTranslations<"campaignsPage">>,
  tMetrics: ReturnType<typeof useTranslations<"metrics">>,
  tTypes: ReturnType<typeof useTranslations<"campaignTypes">>
): string[] {
  return metricColumns.map((col) => {
    if (col.kind === "metric") return tMetrics(METRIC_BY_KEY[col.key].label);
    if (col.kind === "meta_action") {
      const known = META_ACTION_CATALOG.find((a) => a.actionType === col.actionType);
      return known?.label ?? col.actionType;
    }
    if (col.kind === "custom") return customMetrics[col.id]?.name ?? tTypes("customMetric");
    return "";
  });
}

export function CampaignGroupExportButton({
  groupLabel,
  rows,
  metricColumns,
  customMetrics,
  clientLabel,
  clientSlug,
  brandName,
  className
}: {
  groupLabel: string;
  rows: ExportRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  clientLabel?: string;
  clientSlug?: string;
  brandName?: string;
  className?: string;
}) {
  const t = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const tTypes = useTranslations("campaignTypes");
  const locale = useLocale();
  const [exporting, setExporting] = useState(false);

  const labels = {
    campaign: t("colCampaign"),
    client: t("colClient"),
    status: t("colStatus"),
    type: t("colType"),
    total: t("rowTotal"),
    pageOf: (page: number, total: number) => t("exportPageOf", { page, total }),
    statusActive: t("statusActive"),
    statusPaused: t("statusPaused"),
    statusInactive: t("statusInactive"),
    statusDraft: t("statusDraft"),
    campaignsCount: (n: number) => t("exportCampaignsCount", { count: n }),
    clientScope: (client: string) => t("exportClientScope", { client }),
    allClients: t("allClients")
  };

  async function handleExport() {
    if (exporting) return;
    if (!rows.length) {
      window.alert(t("exportEmpty"));
      return;
    }

    setExporting(true);
    try {
      await exportCampaignGroupPdf({
        groupLabel,
        rows,
        metricColumns,
        customMetrics,
        locale,
        labels,
        brandName,
        clientLabel,
        clientSlug,
        metricColumnLabels: resolveMetricColumnLabels(
          metricColumns,
          customMetrics,
          t,
          tMetrics,
          tTypes
        )
      });
    } catch {
      window.alert(t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting}
      className={cn(
        "ui-btn-accent-outline inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold",
        exporting && "cursor-wait opacity-70",
        !rows.length && "opacity-50",
        className
      )}
      title={t("exportGroupPdf")}
    >
      <Download size={14} className="shrink-0" />
      <span className="hidden sm:inline">{t("exportGroup")}</span>
    </button>
  );
}
