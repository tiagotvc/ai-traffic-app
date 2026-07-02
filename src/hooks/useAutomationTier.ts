"use client";

import { useEffect, useState } from "react";

const ENTITLEMENTS_CACHE_KEY = "traffic-ai-shell-entitlements";

function readCachedTier(): number {
  try {
    const raw = sessionStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return 1;
    const j = JSON.parse(raw) as { entitlements?: { limits?: { automationTier?: number } } };
    return j.entitlements?.limits?.automationTier ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Tier do Orion Engine (`PlanLimits.automationTier`, 1–4) do tenant atual — gateia
 * simulação/backtest e modos de execução (alerta/aprovação) no stepper de regras (tier >= 2).
 * Mesmo padrão de cache de `useCopilotAccess`.
 */
export function useAutomationTier(): number {
  const [tier, setTier] = useState<number>(() => readCachedTier());

  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const next = j?.entitlements?.limits?.automationTier;
        if (typeof next === "number") setTier(next);
      })
      .catch(() => {});
  }, []);

  return tier;
}
