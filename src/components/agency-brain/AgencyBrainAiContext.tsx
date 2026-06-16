"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AgencyBrainAiStatus = {
  geminiConfigured: boolean;
  featureAllowed: boolean;
  usage: {
    aiRequestsThisMonth: number;
    maxAiRequestsPerMonth: number;
    remaining: number;
  };
};

type AgencyBrainAiContextValue = {
  status: AgencyBrainAiStatus | null;
  loading: boolean;
  aiDisabled: boolean;
  refresh: () => Promise<void>;
};

const AgencyBrainAiContext = createContext<AgencyBrainAiContextValue | null>(null);

export function AgencyBrainAiProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgencyBrainAiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agency-brain/ai-status");
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
    () => ({ status, loading, aiDisabled, refresh }),
    [status, loading, aiDisabled, refresh]
  );

  return <AgencyBrainAiContext.Provider value={value}>{children}</AgencyBrainAiContext.Provider>;
}

export function useAgencyBrainAi() {
  const ctx = useContext(AgencyBrainAiContext);
  if (!ctx) throw new Error("useAgencyBrainAi must be used within AgencyBrainAiProvider");
  return ctx;
}

/** @deprecated use useAgencyBrainAi */
export const useCreativeMemoryAi = useAgencyBrainAi;
