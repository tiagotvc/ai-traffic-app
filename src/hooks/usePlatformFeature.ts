"use client";

import { useEffect, useState } from "react";

import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";

const ENTITLEMENTS_CACHE_KEY = "traffic-ai-shell-entitlements";

function readCachedPlatformFeatures(): ResolvedFeatureMap {
  try {
    const raw = sessionStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as { platformFeatures?: ResolvedFeatureMap }).platformFeatures ?? {};
  } catch {
    return {};
  }
}

/** Resolves a platform feature flag for the current user (from entitlements cache). */
export function usePlatformFeature(featureId: string): boolean {
  const [flags, setFlags] = useState<ResolvedFeatureMap>(() => readCachedPlatformFeatures());

  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.platformFeatures) setFlags(j.platformFeatures as ResolvedFeatureMap);
      })
      .catch(() => {});
  }, []);

  return flags[featureId] !== false;
}
