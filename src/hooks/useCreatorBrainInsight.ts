"use client";

import { useEffect, useState } from "react";

import { useAiCredits } from "@/hooks/useAiCredits";
import type { CreatorBrainInsightPayload } from "@/lib/campaign-creator/creator-brain-insights";
import { BRAIN_PAUSED_KEY } from "@/lib/campaign-creator/orion-brain-utils";

export function useCreatorBrainInsight(input: {
  objective: string;
  activeNode: string;
  clientSlug?: string | null;
}) {
  const [insight, setInsight] = useState<CreatorBrainInsightPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const { refresh: refreshCredits } = useAiCredits();

  useEffect(() => {
    try {
      setPaused(window.localStorage.getItem(BRAIN_PAUSED_KEY) === "1");
    } catch {
      setPaused(false);
    }
  }, []);

  useEffect(() => {
    if (paused) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      objective: input.objective,
      activeNode: input.activeNode
    });
    if (input.clientSlug) params.set("clientSlug", input.clientSlug);

    fetch(`/api/campaign-creator/brain-insights?${params}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; insight?: CreatorBrainInsightPayload; creditCost?: number }) => {
        if (cancelled) return;
        const next = j.insight ?? null;
        if (next && typeof j.creditCost === "number") {
          next.creditCost = j.creditCost;
        }
        setInsight(next);
        if (j.ok && next) {
          void refreshCredits();
        }
      })
      .catch(() => {
        if (!cancelled) setInsight(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [input.activeNode, input.clientSlug, input.objective, paused, refreshCredits]);

  function togglePaused() {
    const next = !paused;
    setPaused(next);
    try {
      window.localStorage.setItem(BRAIN_PAUSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  return { insight, loading, paused, togglePaused };
}
