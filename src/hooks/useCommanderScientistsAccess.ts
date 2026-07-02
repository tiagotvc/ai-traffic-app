"use client";

import { useEffect, useState } from "react";

import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";

const ENTITLEMENTS_CACHE_KEY = "traffic-ai-shell-entitlements";

type CommanderScientistsState = {
  platformFeatures: ResolvedFeatureMap;
  /** Nome legado no contrato persistido de planos; semanticamente é acesso aos Scientists. */
  allowCopilot: boolean;
};

function readCache(): CommanderScientistsState {
  try {
    const raw = sessionStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return { platformFeatures: {}, allowCopilot: false };
    const json = JSON.parse(raw) as {
      platformFeatures?: ResolvedFeatureMap;
      entitlements?: { limits?: { allowCopilot?: boolean } };
    };
    return {
      platformFeatures: json.platformFeatures ?? {},
      allowCopilot: json.entitlements?.limits?.allowCopilot ?? false
    };
  } catch {
    return { platformFeatures: {}, allowCopilot: false };
  }
}

/** Acesso do Commander aos Scientists: plano + flag hierárquica da capacidade. */
export function useCommanderScientistsAccess(scopeFlag: string): boolean {
  const [state, setState] = useState<CommanderScientistsState>(() => readCache());

  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!json) return;
        setState({
          platformFeatures: (json.platformFeatures as ResolvedFeatureMap) ?? {},
          allowCopilot: json.entitlements?.limits?.allowCopilot ?? false
        });
      })
      .catch(() => {});
  }, []);

  return state.platformFeatures[scopeFlag] !== false && state.allowCopilot;
}
