"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { exportCampaignGroupPdf } from "@/lib/export-campaigns-pdf";
import type { TableColumnRef } from "@/lib/campaign-table-layout";
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

export function CampaignGroupExportButton({
  groupLabel,
  rows,
  metricColumns,
  customMetrics,
  className
}: {
  groupLabel: string;
  rows: ExportRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  className?: string;
}) {
  const t = useTranslations("campaignsPage");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting || !rows.length) return;
    setExporting(true);
    try {
      await exportCampaignGroupPdf({
        groupLabel,
        rows,
        metricColumns,
        customMetrics,
        filename: `campanhas-${groupLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting || !rows.length}
      className={cn(
        "ui-btn-accent-outline inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold",
        exporting && "cursor-wait opacity-70",
        className
      )}
      title={t("exportGroupPdf")}
    >
      <Download size={14} className="shrink-0" />
      <span className="hidden sm:inline">{t("exportGroup")}</span>
    </button>
  );
}
