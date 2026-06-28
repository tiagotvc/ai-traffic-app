import type { MetricKey } from "@/lib/dashboard-metrics";
import type { CampaignPdfRow } from "@/lib/export/campaign-table-pdf";
import type { CampaignExportBranding } from "@/lib/export/campaign-export-branding";

export type CampaignExportFormat = "pdf" | "xlsx";

export type CampaignExportScope =
  | "all"
  | "top_performers"
  | "best_roas"
  | "best_spend"
  | "active_only"
  | "paused_only"
  | "custom";

export type CampaignExportChartKey = "spend_bar" | "roas_line";

export type CampaignExportStatusFilter = "ACTIVE" | "PAUSED" | "DRAFT";

export type CampaignExportFilters = {
  /** Empty = all statuses. */
  statuses: CampaignExportStatusFilter[];
  /** Client names; empty = all clients. */
  clients: string[];
  /** Preset/category keys (`default`, `lead_site`, `custom:id`, …); empty = all types. */
  presets: string[];
};

export const DEFAULT_EXPORT_FILTERS: CampaignExportFilters = {
  statuses: [],
  clients: [],
  presets: []
};

export type CampaignExportConfig = {
  format: CampaignExportFormat;
  scope: CampaignExportScope;
  /** Used when scope is `custom`. */
  customCampaignIds: string[];
  metrics: MetricKey[];
  charts: CampaignExportChartKey[];
  topN: number;
  filters?: CampaignExportFilters;
  branding?: CampaignExportBranding;
};

export const DEFAULT_EXPORT_METRICS: MetricKey[] = [
  "spend",
  "clicks",
  "ctr",
  "cpm",
  "conversions",
  "roas"
];

export const DEFAULT_EXPORT_CHARTS: CampaignExportChartKey[] = ["spend_bar", "roas_line"];

export const EXPORT_SCOPE_TOP_N = 15;

export type CampaignExportContext = {
  rows: CampaignPdfRow[];
  locale: string;
  periodLabel: string;
  clientLabel?: string;
  clientSlug?: string;
  brandName?: string;
  groupLabel: string;
};
