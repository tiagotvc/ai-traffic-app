"use client";

import { useEffect, useState } from "react";

import { isFeatureEnabled } from "@/lib/feature-flags/registry";
import type { FeatureFlagMap } from "@/lib/feature-flags/types";

const ENTITLEMENTS_CACHE_KEY = "traffic-ai-shell-entitlements";

function readCachedPlatformFeatures(): FeatureFlagMap {
  try {
    const raw = sessionStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as { platformFeatures?: FeatureFlagMap }).platformFeatures ?? {};
  } catch {
    return {};
  }
}

/** Resolves a platform feature flag (default ON unless admin disabled). */
export function usePlatformFeature(featureId: string): boolean {
  const [flags, setFlags] = useState<FeatureFlagMap>(() => readCachedPlatformFeatures());

  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.platformFeatures) setFlags(j.platformFeatures as FeatureFlagMap);
      })
      .catch(() => {});
  }, []);

  return isFeatureEnabled(flags, featureId);
}
