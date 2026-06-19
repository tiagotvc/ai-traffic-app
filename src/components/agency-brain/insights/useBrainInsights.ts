"use client";

import { useCallback, useMemo, useState } from "react";

import {
  getFeedItems,
  getFeedStats,
  getHypothesesForLearning,
  getHypothesisById,
  getLearningById,
  getTimelineForLearning,
  updateHypothesisStatus as updateHypothesisStatusRepo
} from "@/lib/agency-brain/insights/mock-repository";
import type { FeedTab, HypothesisStatus } from "@/lib/agency-brain/insights/types";

export const USE_MOCK = true;

export function useBrainInsights() {
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  return useMemo(
    () => ({
      revision,
      getFeedStats,
      getFeedItems: (args: { tab: FeedTab; search: string }) => getFeedItems(args),
      getLearningById,
      getHypothesisById,
      getTimelineForLearning,
      getHypothesesForLearning,
      updateHypothesisStatus: (id: string, status: HypothesisStatus) => {
        const updated = updateHypothesisStatusRepo(id, status);
        bump();
        return updated;
      }
    }),
    [revision, bump]
  );
}
