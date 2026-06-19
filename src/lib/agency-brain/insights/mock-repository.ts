import {
  MOCK_HYPOTHESES,
  MOCK_LEARNINGS,
  MOCK_TIMELINE
} from "@/lib/agency-brain/insights/mock-data";
import type {
  BrainFeedItem,
  BrainFeedStats,
  FeedTab,
  HypothesisStatus,
  InsightHypothesis,
  InsightLearning,
  LearningTimelineEvent
} from "@/lib/agency-brain/insights/types";

let hypotheses = [...MOCK_HYPOTHESES];

function learningById(id: string): InsightLearning | undefined {
  return MOCK_LEARNINGS.find((l) => l.id === id);
}

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function getFeedStats(): BrainFeedStats {
  return {
    learningsCount: MOCK_LEARNINGS.filter((l) => l.status !== "archived").length,
    hypothesesTestingCount: hypotheses.filter((h) => h.status === "testing").length,
    hypothesesPendingCount: hypotheses.filter((h) => h.status === "pending").length,
    highImpactCount: MOCK_LEARNINGS.filter((l) => l.impactLevel === "high").length
  };
}

export function getFeedItems(args: { tab: FeedTab; search: string }): BrainFeedItem[] {
  const { tab, search } = args;
  const items: BrainFeedItem[] = [];

  if (tab === "learnings") {
    for (const learning of MOCK_LEARNINGS) {
      if (learning.status === "archived") continue;
      const haystack = [
        learning.title,
        learning.description,
        learning.evidenceSummary,
        ...learning.tags,
        ...learning.sources.map((s) => `${s.label} ${s.detail}`)
      ].join(" ");
      if (!matchesSearch(haystack, search)) continue;
      items.push({ kind: "learning", learning, sortDate: learning.updatedAt });
    }
  }

  if (tab === "hypotheses") {
    for (const hypothesis of hypotheses) {
      const learning = learningById(hypothesis.learningId);
      const haystack = [
        hypothesis.title,
        hypothesis.description,
        hypothesis.expectedOutcome,
        learning?.title ?? ""
      ].join(" ");
      if (!matchesSearch(haystack, search)) continue;
      items.push({
        kind: "hypothesis",
        hypothesis,
        learningTitle: learning?.title ?? "",
        sortDate: hypothesis.updatedAt
      });
    }
  }

  return items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
}

export function getLearningById(id: string): InsightLearning | null {
  return learningById(id) ?? null;
}

export function getHypothesisById(id: string): InsightHypothesis | null {
  return hypotheses.find((h) => h.id === id) ?? null;
}

export function getTimelineForLearning(learningId: string): LearningTimelineEvent[] {
  return MOCK_TIMELINE.filter((e) => e.learningId === learningId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getHypothesesForLearning(learningId: string): InsightHypothesis[] {
  return hypotheses.filter((h) => h.learningId === learningId);
}

export function updateHypothesisStatus(
  id: string,
  status: HypothesisStatus
): InsightHypothesis | null {
  const idx = hypotheses.findIndex((h) => h.id === id);
  if (idx < 0) return null;
  const updated: InsightHypothesis = {
    ...hypotheses[idx],
    status,
    updatedAt: new Date().toISOString(),
    resultSummary:
      status === "validated"
        ? "Hipótese marcada como validada."
        : status === "rejected"
          ? "Hipótese marcada como rejeitada."
          : status === "inconclusive"
            ? "Resultado inconclusivo — dados insuficientes."
            : hypotheses[idx].resultSummary
  };
  hypotheses = [...hypotheses.slice(0, idx), updated, ...hypotheses.slice(idx + 1)];
  return updated;
}

export function resetMockRepository(): void {
  hypotheses = [...MOCK_HYPOTHESES];
}
