import type { GoalObjective } from "@/db/entities/ClientGoal";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { Range } from "@/lib/dashboard-ranges";
import type { ReportBreakdownSection } from "@/lib/report-breakdown-data";
import type { ReportRecommendation } from "@/lib/report-narrative";

export type ReportAiAnalysis = {
  provider: string;
  executiveSummary: string;
  keyFindings: string[];
  recommendations: ReportRecommendation[];
};

export type ReportSummary = Partial<Record<MetricKey, number>>;

/**
 * Procedência dos números do relatório. Existe porque um relatório zerado por falta de
 * conta vinculada era indistinguível de um relatório zerado por período sem veiculação —
 * os dois renderizavam zeros silenciosos.
 */
export type ReportDataStatus = {
  /** `live` = puxado da Meta agora; `cache` = snapshots locais (refresh falhou ou não rodou). */
  source: "live" | "cache";
  refreshedAt: string | null;
  accountsTotal: number;
  accountsRefreshed: number;
  hasLinkedAccounts: boolean;
  hasData: boolean;
  /** Motivo de não ter conseguido dado fresco, já formatado pra exibição. */
  warning: string | null;
};

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
  adAccount?: {
    id: string;
    metaAdAccountId: string;
    label: string;
  } | null;
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
  anomalies: Array<{ key: MetricKey; delta: number; direction: "good" | "bad" }>;
  narrative: string;
  recommendations: ReportRecommendation[];
  aiAnalysis?: ReportAiAnalysis | null;
  breakdowns: ReportBreakdownSection[];
  dataStatus: ReportDataStatus;
};

export const DEFAULT_REPORT_METRICS: MetricKey[] = ["spend", "clicks", "cpm", "ctr", "conversions"];
