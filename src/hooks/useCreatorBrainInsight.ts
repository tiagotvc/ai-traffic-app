"use client";

import { useEffect, useMemo, useState } from "react";

import type { CreatorBrainInsightPayload } from "@/lib/campaign-creator/creator-brain-insights";
import {
  BRAIN_PAUSED_KEY,
  readBrainCache,
  writeBrainCache
} from "@/lib/campaign-creator/orion-brain-utils";

export function useCreatorBrainInsight(input: {
  objective: string;
  activeNode: string;
  clientSlug?: string | null;
}) {
  const [insight, setInsight] = useState<CreatorBrainInsightPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      setPaused(window.localStorage.getItem(BRAIN_PAUSED_KEY) === "1");
    } catch {
      setPaused(false);
    }
  }, []);

  const cacheKey = useMemo(
    () => `${input.clientSlug ?? ""}|${input.objective}|${input.activeNode}`,
    [input.activeNode, input.clientSlug, input.objective]
  );

  useEffect(() => {
    if (paused) {
      setInsight(readBrainCache(cacheKey));
      setLoading(false);
      return;
    }

    const cached = readBrainCache(cacheKey);
    if (cached) {
      setInsight(cached);
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
      .then((j: { ok?: boolean; insight?: CreatorBrainInsightPayload }) => {
        if (cancelled) return;
        const next = j.insight ?? null;
        setInsight(next);
        if (next) writeBrainCache(cacheKey, next);
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
  }, [cacheKey, input.activeNode, input.clientSlug, input.objective, paused]);

  function togglePaused() {
    const next = !paused;
    setPaused(next);
    try {
      window.localStorage.setItem(BRAIN_PAUSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  return { insight, loading, paused, togglePaused, cacheKey };
}
