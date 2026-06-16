"use client";

import { useCallback, useEffect, useState } from "react";

import { customTypeKey } from "@/lib/campaign-type-keys";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type CampaignTypeDto = {
  id: string;
  name: string;
  metrics: MetricKey[];
  shared: boolean;
  createdByUserId: string;
};

export function useCampaignTypes() {
  const [types, setTypes] = useState<CampaignTypeDto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch("/api/campaign-types");
    const j = await res.json();
    if (j.ok) setTypes(j.types ?? []);
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const typesMap = useCallback(() => {
    const m = new Map<string, { metrics: string[] }>();
    for (const t of types) m.set(t.id, { metrics: t.metrics });
    return m;
  }, [types]);

  const createType = useCallback(
    async (input: { name: string; metrics: MetricKey[]; shared?: boolean }) => {
      const res = await fetch("/api/campaign-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const j = await res.json();
      if (j.ok) {
        await reload();
        return j.type as CampaignTypeDto;
      }
      return null;
    },
    [reload]
  );

  const presetKeyForType = (id: string) => customTypeKey(id);

  return { types, loading, reload, typesMap, createType, presetKeyForType };
}
