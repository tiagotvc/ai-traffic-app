"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CreativeMemoryAiStatus = {
  geminiConfigured: boolean;
  featureAllowed: boolean;
  usage: {
    aiRequestsThisMonth: number;
    maxAiRequestsPerMonth: number;
    remaining: number;
  };
};

type CreativeMemoryAiContextValue = {
  status: CreativeMemoryAiStatus | null;
  loading: boolean;
  aiDisabled: boolean;
  refresh: () => Promise<void>;
};

const CreativeMemoryAiContext = createContext<CreativeMemoryAiContextValue | null>(null);

export function CreativeMemoryAiProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CreativeMemoryAiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/creative-memory/ai-status");
      const json = await res.json();
      if (json.ok) {
        setStatus({
          geminiConfigured: json.geminiConfigured ?? false,
          featureAllowed: json.featureAllowed ?? false,
          usage: json.usage ?? {
            aiRequestsThisMonth: 0,
            maxAiRequestsPerMonth: 0,
            remaining: 0
          }
        });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const aiDisabled =
    !status?.featureAllowed ||
    !status?.geminiConfigured ||
    (status?.usage.remaining ?? 0) <= 0;

  const value = useMemo(
    () => ({
      status,
      loading,
      aiDisabled,
      refresh
    }),
    [status, loading, aiDisabled, refresh]
  );

  return (
    <CreativeMemoryAiContext.Provider value={value}>{children}</CreativeMemoryAiContext.Provider>
  );
}

export function useCreativeMemoryAi() {
  const ctx = useContext(CreativeMemoryAiContext);
  if (!ctx) {
    throw new Error("useCreativeMemoryAi must be used within CreativeMemoryAiProvider");
  }
  return ctx;
}
