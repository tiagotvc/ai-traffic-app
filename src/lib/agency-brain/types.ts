import type {
  LearningCategory,
  LearningConfidence,
  LearningImpact,
  LearningSource,
  LearningStatus
} from "@/db/entities/ClientLearning";

export type {
  LearningCategory,
  LearningConfidence,
  LearningImpact,
  LearningSource,
  LearningStatus
};

export type MetricSnapshotPayload = {
  ctr?: number;
  cpa?: number;
  cpc?: number;
  roas?: number;
  spend?: number;
  conversions?: number;
  impressions?: number;
  clicks?: number;
  frequency?: number;
  periodDays?: number;
  periodStart?: string;
  periodEnd?: string;
};

export type EvidencePayload = {
  ruleId?: string;
  reason?: string;
  deltaPercent?: number;
  baselineValue?: number;
  actualValue?: number;
  metaCampaignId?: string;
  metaAdId?: string;
  campaignName?: string;
  comparedTo?: string;
};

export type LearningFilters = {
  category?: LearningCategory;
  impact?: LearningImpact;
  confidence?: LearningConfidence;
  source?: LearningSource;
  status?: LearningStatus;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type LearningDto = {
  id: string;
  clientId: string;
  metaCampaignId: string | null;
  metaAdId: string | null;
  creativeAssetId: string | null;
  title: string;
  description: string;
  category: LearningCategory;
  impact: LearningImpact;
  confidence: LearningConfidence;
  source: LearningSource;
  status: LearningStatus;
  tags: string[];
  metricSnapshot: MetricSnapshotPayload | null;
  evidence: EvidencePayload | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLearningInput = {
  title: string;
  description: string;
  category: LearningCategory;
  impact?: LearningImpact;
  confidence?: LearningConfidence;
  tags?: string[];
  metaCampaignId?: string | null;
  metaAdId?: string | null;
  creativeAssetId?: string | null;
  metricSnapshot?: MetricSnapshotPayload | null;
};

export type UpdateLearningInput = Partial<CreateLearningInput>;

export type BrainSummary = {
  total: number;
  highImpact: number;
  creativeCount: number;
  audienceCount: number;
  pendingSuggestions: number;
  byCategory: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentApproved: LearningDto[];
};

export type ClientBrainContext = {
  clientId: string;
  topLearnings: LearningDto[];
  creativeLearnings: LearningDto[];
  audienceLearnings: LearningDto[];
  offerLearnings: LearningDto[];
  negativeLearnings: LearningDto[];
  recentLearnings: LearningDto[];
  highImpactLearnings: LearningDto[];
  tags: string[];
  summaryText: string;
};

export type CampaignMetricsRow = {
  metaCampaignId: string;
  campaignName: string;
  spend: number;
  conversions: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpa: number | null;
  roas: number;
  frequency: number;
};

export type SuggestedLearningDraft = {
  title: string;
  description: string;
  category: LearningCategory;
  impact: LearningImpact;
  confidence: LearningConfidence;
  metaCampaignId?: string | null;
  metaAdId?: string | null;
  metricSnapshot?: MetricSnapshotPayload;
  evidence: EvidencePayload;
  dedupeKey: string;
  tags?: string[];
};
