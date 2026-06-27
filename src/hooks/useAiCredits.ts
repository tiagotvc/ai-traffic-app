"use client";

import { useCallback, useEffect, useState } from "react";

export type AiCreditsBalance = {
  remaining: number;
  max: number;
  used: number;
  unlimited: boolean;
};

type UseAiCreditsResult = {
  loading: boolean;
  balance: AiCreditsBalance | null;
  refresh: () => Promise<void>;
};

type AiStatusResponse = {
  ok?: boolean;
  usage?: {
    aiRequestsThisMonth?: number;
    maxAiRequestsPerMonth?: number;
    remaining?: number;
  };
};

let cachedBalance: AiCreditsBalance | null = null;
let inflight: Promise<AiCreditsBalance | null> | null = null;

function parseBalance(json: AiStatusResponse): AiCreditsBalance | null {
  const usage = json.usage;
  if (!usage) return null;

  const max = usage.maxAiRequestsPerMonth ?? 0;
  const used = usage.aiRequestsThisMonth ?? 0;
  const unlimited = max < 0;

  if (unlimited) {
    return { remaining: -1, max, used, unlimited: true };
  }

  const rawRemaining = usage.remaining;
  const remaining =
    typeof rawRemaining === "number" && Number.isFinite(rawRemaining)
      ? Math.max(0, rawRemaining)
      : Math.max(0, max - used);

  return { remaining, max, used, unlimited: false };
}

async function fetchAiCreditsBalance(): Promise<AiCreditsBalance | null> {
  if (cachedBalance) return cachedBalance;
  if (inflight) return inflight;

  inflight = fetch("/api/creative-memory/ai-status")
    .then((r) => r.json() as Promise<AiStatusResponse>)
    .then((json) => {
      if (!json.ok) return null;
      const balance = parseBalance(json);
      if (balance) cachedBalance = balance;
      return balance;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Tenant AI credit balance (works with credits V2 and legacy quota). */
export function useAiCredits(): UseAiCreditsResult {
  const [loading, setLoading] = useState(!cachedBalance);
  const [balance, setBalance] = useState<AiCreditsBalance | null>(cachedBalance);

  const refresh = useCallback(async () => {
    cachedBalance = null;
    setLoading(true);
    const next = await fetchAiCreditsBalance();
    setBalance(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cachedBalance) {
      setBalance(cachedBalance);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchAiCreditsBalance().then((next) => {
      if (cancelled) return;
      setBalance(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, balance, refresh };
}
