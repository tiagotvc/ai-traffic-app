"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_CAMPAIGN_TABLE_LAYOUT,
  DEFAULT_LAYOUT_ID,
  normalizeCampaignTableLayouts,
  normalizeTableColumnRefs,
  type CampaignTableLayout,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import {
  ALL_CAMPAIGN_COLUMNS,
  DEFAULT_CAMPAIGN_COLUMNS,
  type CampaignColumnId
} from "@/lib/campaign-table-columns";
import type { CustomMetricDto } from "@/lib/custom-metric-types";

const LS_KEY = "traffic-campaign-columns";

function localColumnsToLayout(): CampaignTableLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignColumnId[];
    if (!Array.isArray(parsed) || !parsed.length) return null;
    const fieldCols: TableColumnRef[] = parsed
      .filter((c) => ALL_CAMPAIGN_COLUMNS.includes(c))
      .map((id) => ({ kind: "field" as const, id }));
    if (!fieldCols.length) return null;
    const defaultMetrics = DEFAULT_CAMPAIGN_TABLE_LAYOUT.columns.filter(
      (c) => c.kind === "metric" || c.kind === "meta_action" || c.kind === "custom"
    );
    return {
      id: "migrated-local",
      name: "Padrão",
      columns: [...fieldCols, ...defaultMetrics]
    };
  } catch {
    return null;
  }
}

export function useCampaignTableLayout() {
  const [layouts, setLayouts] = useState<CampaignTableLayout[]>([DEFAULT_CAMPAIGN_TABLE_LAYOUT]);
  const [activeLayoutId, setActiveLayoutId] = useState(DEFAULT_LAYOUT_ID);
  const [customMetrics, setCustomMetrics] = useState<CustomMetricDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/settings/campaign-table-layouts");
    const j = await res.json();
    if (!j.ok) return;
    let nextLayouts = normalizeCampaignTableLayouts(j.layouts);
    let nextActive = j.activeLayoutId ?? DEFAULT_LAYOUT_ID;

    const migrated = localColumnsToLayout();
    if (
      migrated &&
      nextLayouts.length === 1 &&
      nextLayouts[0]?.id === DEFAULT_LAYOUT_ID &&
      JSON.stringify(nextLayouts[0]?.columns) === JSON.stringify(DEFAULT_CAMPAIGN_TABLE_LAYOUT.columns)
    ) {
      nextLayouts = [migrated];
      nextActive = migrated.id;
      await fetch("/api/settings/campaign-table-layouts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layouts: nextLayouts, activeLayoutId: nextActive })
      });
      localStorage.removeItem(LS_KEY);
    }

    setLayouts(nextLayouts);
    setActiveLayoutId(nextActive);
    setCustomMetrics(j.customMetrics ?? []);
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) ?? layouts[0] ?? DEFAULT_CAMPAIGN_TABLE_LAYOUT,
    [layouts, activeLayoutId]
  );

  const customMetricsMap = useMemo(() => {
    const m: Record<string, { id: string; name: string; formula: string; format: string }> = {};
    for (const c of customMetrics) m[c.id] = c;
    return m;
  }, [customMetrics]);

  const saveLayouts = useCallback(
    async (nextLayouts: CampaignTableLayout[], nextActiveId?: string) => {
      const res = await fetch("/api/settings/campaign-table-layouts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          layouts: nextLayouts,
          activeLayoutId: nextActiveId ?? activeLayoutId
        })
      });
      const j = await res.json();
      if (j.ok) {
        setLayouts(j.layouts);
        setActiveLayoutId(j.activeLayoutId);
      }
    },
    [activeLayoutId]
  );

  const applyLayout = useCallback(
    async (columns: TableColumnRef[], layoutId?: string) => {
      const id = layoutId ?? activeLayoutId;
      const next = layouts.map((l) => (l.id === id ? { ...l, columns: normalizeTableColumnRefs(columns) } : l));
      await saveLayouts(next, id);
    },
    [activeLayoutId, layouts, saveLayouts]
  );

  const saveAsNewLayout = useCallback(
    async (name: string, columns: TableColumnRef[]) => {
      const id = crypto.randomUUID();
      const next = [...layouts, { id, name: name.trim(), columns: normalizeTableColumnRefs(columns) }];
      await saveLayouts(next, id);
    },
    [layouts, saveLayouts]
  );

  const setActiveLayout = useCallback(
    async (id: string) => {
      await saveLayouts(layouts, id);
    },
    [layouts, saveLayouts]
  );

  const resetToDefault = useCallback(async () => {
    const defaultCols: TableColumnRef[] = DEFAULT_CAMPAIGN_COLUMNS.map((id) => ({
      kind: "field",
      id
    }));
    await applyLayout(defaultCols);
  }, [applyLayout]);

  return {
    loading,
    layouts,
    activeLayout,
    activeLayoutId,
    columns: activeLayout.columns,
    customMetrics,
    customMetricsMap,
    modalOpen,
    setModalOpen,
    reload,
    applyLayout,
    saveAsNewLayout,
    setActiveLayout,
    resetToDefault,
    saveLayouts
  };
}
