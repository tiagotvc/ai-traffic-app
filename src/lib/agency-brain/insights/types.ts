export type ImpactLevel = "low" | "medium" | "high";

export type LearningStatus = "active" | "weakening" | "archived";

export type HypothesisStatus =
  | "pending"
  | "testing"
  | "validated"
  | "rejected"
  | "inconclusive";

export type TimelineEventType =
  | "created"
  | "reinforced"
  | "weakened"
  | "hypothesis_validated"
  | "hypothesis_rejected"
  | "market_signal"
  | "competitor_signal"
  | "agency_pattern"
  | "client_pattern";

export type FeedTab = "learnings" | "hypotheses";

export type FeedVariant = FeedTab;

export type EvidenceSourceType = "meta_ads" | "agency" | "market" | "competitor" | "hypothesis";

export type EvidenceSource = {
  type: EvidenceSourceType;
  label: string;
  detail: string;
};

export type InsightLearning = {
  id: string;
  title: string;
  description: string;
  confidenceScore: number;
  impactLevel: ImpactLevel;
  status: LearningStatus;
  tags: string[];
  evidenceSummary: string;
  sources: EvidenceSource[];
  whyBelieves: string[];
  createdAt: string;
  updatedAt: string;
};

export type InsightHypothesis = {
  id: string;
  learningId: string;
  title: string;
  description: string;
  expectedOutcome: string;
  targetMetric: string;
  testPeriod: string;
  status: HypothesisStatus;
  resultSummary: string;
  executionPlan: string[];
  createdAt: string;
  updatedAt: string;
};

export type LearningTimelineEvent = {
  id: string;
  learningId: string;
  date: string;
  title: string;
  description: string;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  eventType: TimelineEventType;
  sourceType?: EvidenceSourceType;
  sourceDetail?: string;
};

export type BrainFeedStats = {
  learningsCount: number;
  hypothesesTestingCount: number;
  hypothesesPendingCount: number;
  highImpactCount: number;
};

export type BrainFeedLearningItem = {
  kind: "learning";
  learning: InsightLearning;
  sortDate: string;
};

export type BrainFeedHypothesisItem = {
  kind: "hypothesis";
  hypothesis: InsightHypothesis;
  learningTitle: string;
  sortDate: string;
};

export type BrainFeedItem = BrainFeedLearningItem | BrainFeedHypothesisItem;

export type LearningsSubView = "feed" | "logs";

export type ResearchLogType =
  | "refine"
  | "market_scan"
  | "pattern_detect"
  | "ai_analysis"
  | "market_synthesis";

export type ResearchLogStatus = "success" | "warning" | "error";

export type ResearchLogAdSample = {
  advertiser: string;
  hook: string;
  format?: string;
  cta?: string;
  daysRunning?: number;
  libraryUrl?: string;
};

export type ResearchLogCompetitor = {
  name: string;
  adsFound: number;
};

export type ResearchLogHookStat = {
  hook: string;
  count: number;
  avgDays?: number;
};

export type ResearchLogCtaStat = {
  cta: string;
  count: number;
};

export type ResearchLogPatternItem = {
  label: string;
  detail: string;
};

export type ResearchLogTextItem = {
  title: string;
  body?: string;
};

export type ResearchLogDetails = {
  niche?: string;
  marketCountry?: string;
  searchTerms?: string[];
  competitors?: ResearchLogCompetitor[];
  adSamples?: ResearchLogAdSample[];
  topHooks?: ResearchLogHookStat[];
  topCtas?: ResearchLogCtaStat[];
  campaignPatterns?: ResearchLogPatternItem[];
  aiSuggestions?: ResearchLogTextItem[];
  synthesisItems?: ResearchLogTextItem[];
  campaignsAnalyzed?: string[];
  dateRange?: string;
};

export type ResearchLogEntry = {
  id: string;
  clientId: string;
  type: ResearchLogType;
  title: string;
  detail: string;
  status: ResearchLogStatus;
  pointsUsed?: number;
  adsAnalyzed?: number;
  patternsFound?: number;
  learningsCreated?: number;
  marketInsights?: number;
  details?: ResearchLogDetails;
  createdAt: string;
};
