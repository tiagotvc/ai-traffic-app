import { DEFAULT_REPORT_METRICS } from "@/lib/report-preview-types";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { ReportTemplateConfig } from "@/components/reports/ReportsTemplatesControl";

export type BuiltinTemplateId =
  | "performance"
  | "executive"
  | "weekly"
  | "monthly"
  | "alerts"
  | "consolidated";

export type BuiltinReportTemplate = {
  id: BuiltinTemplateId;
  kind: "single" | "consolidated";
  reportType?: "simple" | "complete";
  metrics?: MetricKey[];
  periodPreset?: string;
};

export const BUILTIN_REPORT_TEMPLATES: BuiltinReportTemplate[] = [
  {
    id: "performance",
    kind: "single",
    reportType: "simple",
    metrics: DEFAULT_REPORT_METRICS,
    periodPreset: "thisWeek"
  },
  {
    id: "executive",
    kind: "single",
    reportType: "complete",
    metrics: DEFAULT_REPORT_METRICS,
    periodPreset: "last30"
  },
  {
    id: "weekly",
    kind: "single",
    reportType: "simple",
    metrics: DEFAULT_REPORT_METRICS,
    periodPreset: "thisWeek"
  },
  {
    id: "monthly",
    kind: "single",
    reportType: "complete",
    metrics: DEFAULT_REPORT_METRICS,
    periodPreset: "thisMonth"
  },
  {
    id: "alerts",
    kind: "single",
    reportType: "simple",
    metrics: ["spend", "conversions", "cpa", "ctr"] as MetricKey[],
    periodPreset: "last7"
  },
  { id: "consolidated", kind: "consolidated" }
];

export function builtinToConfig(tpl: BuiltinReportTemplate): ReportTemplateConfig | null {
  if (tpl.kind === "consolidated" || !tpl.reportType) return null;
  return {
    reportType: tpl.reportType,
    metrics: tpl.metrics ?? DEFAULT_REPORT_METRICS,
    periodPreset: tpl.periodPreset ?? null
  };
}
