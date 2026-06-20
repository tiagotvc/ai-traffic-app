/**
 * Phase 2: map existing API DTOs to Insight MVP types.
 * Stub — wire when backend exposes unified feed + timeline.
 */
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import type { LearningDto } from "@/lib/agency-brain/types";
import type {
  ImpactLevel,
  InsightHypothesis,
  InsightLearning,
  LearningStatus,
  EvidenceSource
} from "@/lib/agency-brain/insights/types";

function mapImpact(impact: string): ImpactLevel {
  return impact.toLowerCase() as ImpactLevel;
}

function mapLearningStatus(status: LearningDto["status"]): LearningStatus {
  switch (status) {
    case "APPROVED":
      return "active";
    case "ARCHIVED":
      return "archived";
    default:
      return "weakening";
  }
}

function mapSource(source: LearningDto["source"]): EvidenceSource {
  switch (source) {
    case "AI":
      return { type: "agency", label: "IA", detail: "Análise gerada por IA" };
    case "IMPORTED":
      return { type: "meta_ads", label: "Meta Ads", detail: "Importado de campanhas" };
    case "RULE":
      return { type: "agency", label: "Regra", detail: "Detectado por regra automática" };
    default:
      return { type: "agency", label: "Agência", detail: "Registro manual" };
  }
}

export function learningDtoToInsight(dto: LearningDto): InsightLearning {
  const evidenceReason = dto.evidence?.reason ?? dto.description ?? "";
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? "",
    confidenceScore: dto.confidenceScore ?? 0,
    impactLevel: mapImpact(dto.impact),
    status: mapLearningStatus(dto.status),
    tags: dto.tags ?? [],
    evidenceSummary: evidenceReason,
    sources: [mapSource(dto.source)],
    whyBelieves: evidenceReason ? [evidenceReason] : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

export function hypothesisDtoToInsight(
  dto: HypothesisDto,
  learningId = ""
): InsightHypothesis {
  return {
    id: dto.id,
    learningId,
    title: dto.title,
    description: dto.description ?? "",
    expectedOutcome: "",
    targetMetric: "",
    testPeriod: "",
    status:
      dto.status === "CONFIRMED"
        ? "validated"
        : dto.status === "TESTING"
          ? "testing"
          : dto.status === "REJECTED"
            ? "rejected"
            : "pending",
    resultSummary: "",
    executionPlan: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}
