"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import {
  getFeedItems as getMockFeedItems,
  getFeedStats as getMockFeedStats,
  getHypothesisById as getMockHypothesisById,
  getHypothesesForLearning as getMockHypothesesForLearning,
  getLearningById as getMockLearningById,
  getTimelineForLearning as getMockTimelineForLearning,
  updateHypothesisStatus as updateMockHypothesisStatus
} from "@/lib/agency-brain/insights/mock-repository";
import {
  hypothesisDtoToInsight,
  learningDtoToInsight
} from "@/lib/agency-brain/insights/adapters";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import type { LearningDto } from "@/lib/agency-brain/types";
import type {
  BrainFeedItem,
  BrainFeedStats,
  FeedTab,
  HypothesisStatus,
  InsightHypothesis,
  InsightLearning,
  LearningTimelineEvent
} from "@/lib/agency-brain/insights/types";

export const USE_MOCK = false;

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function buildFeedItems(
  learnings: InsightLearning[],
  hypotheses: InsightHypothesis[],
  tab: FeedTab,
  search: string
): BrainFeedItem[] {
  const items: BrainFeedItem[] = [];

  if (tab === "learnings") {
    for (const learning of learnings) {
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
      const learning = learnings.find((l) => l.id === hypothesis.learningId);
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

function buildFeedStats(learnings: InsightLearning[], hypotheses: InsightHypothesis[]): BrainFeedStats {
  return {
    learningsCount: learnings.filter((l) => l.status !== "archived").length,
    hypothesesTestingCount: hypotheses.filter((h) => h.status === "testing").length,
    hypothesesPendingCount: hypotheses.filter((h) => h.status === "pending").length,
    highImpactCount: learnings.filter((l) => l.impactLevel === "high").length
  };
}

function timelineFromLearning(learning: InsightLearning): LearningTimelineEvent[] {
  return [
    {
      id: `${learning.id}-created`,
      learningId: learning.id,
      date: learning.createdAt,
      title: learning.title,
      description: learning.description,
      confidenceBefore: null,
      confidenceAfter: learning.confidenceScore,
      eventType: "created"
    }
  ];
}

export function useBrainInsights() {
  const { clientSlug } = useAgencyBrainClient();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [learnings, setLearnings] = useState<InsightLearning[]>([]);
  const [hypotheses, setHypotheses] = useState<InsightHypothesis[]>([]);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    if (USE_MOCK) {
      setLoading(false);
      return;
    }
    if (!clientSlug) {
      setLearnings([]);
      setHypotheses([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [learnRes, hypRes] = await Promise.all([
          fetch(
            `/api/clients/${encodeURIComponent(clientSlug)}/learnings?pageSize=100&sortBy=updatedAt&sortDir=desc`
          ),
          fetch(
            `/api/clients/${encodeURIComponent(clientSlug)}/hypotheses?pageSize=100&sortBy=updatedAt&sortDir=desc`
          )
        ]);

        const learnJson = await learnRes.json();
        const hypJson = await hypRes.json();

        if (cancelled) return;

        if (learnJson.ok) {
          setLearnings(
            ((learnJson.items ?? []) as LearningDto[])
              .filter((dto) => dto.status === "APPROVED" || dto.status === "SUGGESTED")
              .map(learningDtoToInsight)
          );
        } else {
          setLearnings([]);
        }

        if (hypJson.ok) {
          setHypotheses(
            ((hypJson.items ?? []) as HypothesisDto[]).map((dto) =>
              hypothesisDtoToInsight(dto, dto.promotedLearningId ?? "")
            )
          );
        } else {
          setHypotheses([]);
        }
      } catch {
        if (!cancelled) {
          setLearnings([]);
          setHypotheses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientSlug, revision]);

  return useMemo(() => {
    if (USE_MOCK) {
      return {
        revision,
        loading: false,
        refresh: bump,
        getFeedStats: getMockFeedStats,
        getFeedItems: (args: { tab: FeedTab; search: string }) => getMockFeedItems(args),
        getLearningById: getMockLearningById,
        getHypothesisById: getMockHypothesisById,
        getTimelineForLearning: getMockTimelineForLearning,
        getHypothesesForLearning: getMockHypothesesForLearning,
        updateHypothesisStatus: (id: string, status: HypothesisStatus) => {
          const updated = updateMockHypothesisStatus(id, status);
          bump();
          return updated;
        }
      };
    }

    return {
      revision,
      loading,
      refresh: bump,
      getFeedStats: () => buildFeedStats(learnings, hypotheses),
      getFeedItems: (args: { tab: FeedTab; search: string }) =>
        buildFeedItems(learnings, hypotheses, args.tab, args.search),
      getLearningById: (id: string) => learnings.find((l) => l.id === id) ?? null,
      getHypothesisById: (id: string) => hypotheses.find((h) => h.id === id) ?? null,
      getTimelineForLearning: (learningId: string) => {
        const learning = learnings.find((l) => l.id === learningId);
        return learning ? timelineFromLearning(learning) : [];
      },
      getHypothesesForLearning: (learningId: string) =>
        hypotheses.filter((h) => h.learningId === learningId),
      updateHypothesisStatus: (id: string, status: HypothesisStatus) => {
        const current = hypotheses.find((h) => h.id === id);
        if (!current || !clientSlug) return null;

        const action =
          status === "validated" ? "confirm" : status === "rejected" ? "reject" : null;

        if (action) {
          void fetch(
            `/api/clients/${encodeURIComponent(clientSlug)}/hypotheses/${encodeURIComponent(id)}/${action}`,
            { method: "PATCH" }
          ).then(() => bump());
        }

        const updated: InsightHypothesis = {
          ...current,
          status,
          updatedAt: new Date().toISOString(),
          resultSummary:
            status === "validated"
              ? "Hipótese confirmada."
              : status === "rejected"
                ? "Hipótese rejeitada."
                : current.resultSummary
        };

        setHypotheses((prev) => prev.map((h) => (h.id === id ? updated : h)));
        return updated;
      }
    };
  }, [revision, bump, learnings, hypotheses, clientSlug, loading]);
}
