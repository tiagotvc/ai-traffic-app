"use client";

import { useEffect, useState } from "react";

import { DEFAULT_AI_CREDIT_WEIGHTS } from "@/lib/ai-credits/defaults";
import type { AiCreditKind } from "@/lib/ai-credits/types";

/**
 * Resolves credit cost for an AI action from tenant admin weights when credits V2 is active,
 * otherwise falls back to platform defaults.
 */
export function useAiCreditCost(kind: AiCreditKind): number {
  const [cost, setCost] = useState(DEFAULT_AI_CREDIT_WEIGHTS[kind]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/ai-credits")
      .then((r) => r.json())
      .then((j: { enabled?: boolean; weights?: Partial<Record<AiCreditKind, number>> }) => {
        if (cancelled) return;
        const fromAdmin = j.weights?.[kind];
        if (typeof fromAdmin === "number" && fromAdmin > 0) {
          setCost(fromAdmin);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return cost;
}
