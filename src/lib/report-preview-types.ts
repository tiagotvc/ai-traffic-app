import type { GoalObjective } from "@/db/entities/ClientGoal";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { Range } from "@/lib/dashboard-ranges";
import type { ReportRecommendation } from "@/lib/report-narrative";

export type ReportSummary = Partial<Record<MetricKey, number>>;

export type CampaignSpendRow = {
  metaCampaignId: string;
  name: string;
  spend: number;
  conversions: number;
  clicks: number;
  sharePct: number;
};

export type ReportPreviewPayload = {
  ok: true;
  client: {
    id: string;
    slug: string;
    name: string;
    dominantPreset: string;
    goalObjective: GoalObjective;
    goalMetric: MetricKey;
  };
  period: {
    current: Range;
    previous: Range;
    currentLabel: string;
    previousLabel: string;
  };
  summary: ReportSummary;
  previousSummary: ReportSummary | null;
  series: Array<{ day: string } & ReportSummary>;
  previousSeries: Array<{ day: string } & ReportSummary>;
  campaigns: CampaignSpendRow[];
  comparisonBars: Array<{ key: MetricKey; current: number; previous: number; delta: number | null }>;
  narrative: string;
  recommendations: ReportRecommendation[];
};

export const DEFAULT_REPORT_METRICS: MetricKey[] = ["spend", "clicks", "cpm", "ctr", "conversions"];
