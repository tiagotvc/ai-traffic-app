"use client";

import { useCallback, useEffect, useState } from "react";

import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";

export function useWidgetData<T = unknown>(widgetType: string, enabled = true) {
  const strip = useCommandStripOptional();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const period: PeriodState = strip?.period ?? { preset: "last30", since: "", until: "" };
  const clientFilter = strip?.clientFilter ?? "";
  const accountFilter = strip?.accountFilter ?? "";

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams(periodStateToQuery(period));
      if (clientFilter) q.set("clientId", clientFilter);
      if (accountFilter) q.set("accountId", accountFilter);
      const res = await fetch(
        `/api/dashboard/widgets/${encodeURIComponent(widgetType)}/data?${q.toString()}`
      );
      const j = await res.json();
      if (j.ok) setData(j.data as T);
      else setError(j.error ?? "Error");
    } catch {
      setError("Error");
    } finally {
      setLoading(false);
    }
  }, [enabled, widgetType, period, clientFilter, accountFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
