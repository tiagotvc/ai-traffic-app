"use client";

import { useEffect, useState } from "react";

import type { DraftTargeting } from "@/lib/campaign-draft";

export type ReachEstimateTier = "good" | "medium" | "low";

export type ReachEstimateState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | {
      status: "ready";
      usersLowerBound: number;
      usersUpperBound: number;
      usersMid: number;
      tier: ReachEstimateTier;
    };

function tierFromMid(mid: number): ReachEstimateTier {
  if (mid >= 1_000_000) return "good";
  if (mid >= 100_000) return "medium";
  return "low";
}

export function useTargetingReachEstimate({
  targeting,
  clientSlug,
  adAccountId,
  enabled
}: {
  targeting: DraftTargeting;
  clientSlug: string;
  adAccountId: string;
  enabled: boolean;
}): ReachEstimateState {
  const [state, setState] = useState<ReachEstimateState>({ status: "empty" });

  useEffect(() => {
    if (!enabled || !clientSlug || !adAccountId || targeting.locations.length === 0) {
      setState({ status: "empty" });
      return;
    }

    const ctrl = new AbortController();
    setState({ status: "loading" });

    const timer = window.setTimeout(() => {
      fetch("/api/meta/delivery-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          targeting
        })
      })
        .then((r) => r.json())
        .then(
          (j: {
            ok?: boolean;
            estimateReady?: boolean;
            usersLowerBound?: number | null;
            usersUpperBound?: number | null;
            reason?: string;
          }) => {
            if (!j.ok || j.estimateReady === false) {
              setState({ status: "unavailable" });
              return;
            }
            const lower = j.usersLowerBound ?? 0;
            const upper = j.usersUpperBound ?? lower;
            if (lower <= 0 && upper <= 0) {
              setState({ status: "unavailable" });
              return;
            }
            const usersMid = Math.round((lower + upper) / 2);
            setState({
              status: "ready",
              usersLowerBound: lower,
              usersUpperBound: upper,
              usersMid,
              tier: tierFromMid(usersMid)
            });
          }
        )
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setState({ status: "error" });
        });
    }, 650);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [targeting, clientSlug, adAccountId, enabled]);

  return state;
}
