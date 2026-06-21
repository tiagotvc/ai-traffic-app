"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { LayoutDto, WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

export function useEntitlementsCanvas(initialAllowCanvas: boolean) {
  const [allowCanvas, setAllowCanvas] = useState(initialAllowCanvas);

  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((r) => r.json())
      .then((j) =>
        setAllowCanvas(!!j.isPlatformAdmin || !!j.entitlements?.limits?.allowDashboardCanvas)
      )
      .catch(() => setAllowCanvas(false));
  }, []);

  return allowCanvas;
}

export function useDashboardCanvas() {
  const [layouts, setLayouts] = useState<LayoutDto[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [catalog, setCatalog] = useState<
    Array<{ type: string; titleKey: string; category: string; allowed: boolean; comingSoon?: boolean }>
  >([]);

  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) ?? layouts.find((l) => l.isDefault) ?? layouts[0],
    [layouts, activeLayoutId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        fetch("/api/dashboard/layouts"),
        fetch("/api/dashboard/catalog")
      ]);
      const lJson = await lRes.json();
      const cJson = await cRes.json();
      if (lJson.ok && Array.isArray(lJson.layouts)) {
        setLayouts(lJson.layouts);
        const def = lJson.layouts.find((x: LayoutDto) => x.isDefault) ?? lJson.layouts[0];
        if (def) setActiveLayoutId(def.id);
      }
      if (cJson.ok && Array.isArray(cJson.widgets)) {
        setCatalog(cJson.widgets);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveWidgets = useCallback(
    async (widgets: WidgetInstanceDto[]) => {
      if (!activeLayout) return;
      const res = await fetch(`/api/dashboard/layouts/${activeLayout.id}/widgets`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ widgets })
      });
      const j = await res.json();
      if (j.ok && j.layout) {
        setLayouts((cur) => cur.map((l) => (l.id === j.layout.id ? j.layout : l)));
      }
    },
    [activeLayout]
  );

  const addWidget = useCallback(
    (widgetType: string) => {
      if (!activeLayout) return;
      const def = getWidgetDefinition(widgetType);
      if (!def) return;
      const maxY = activeLayout.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
      const next: WidgetInstanceDto = {
        id: `new-${Date.now()}`,
        layoutId: activeLayout.id,
        widgetType,
        title: null,
        x: 0,
        y: maxY,
        w: def.defaultW,
        h: def.defaultH,
        size: def.size,
        visible: true,
        config: { ...(def.defaultConfig ?? {}) },
        sortOrder: activeLayout.widgets.length
      };
      void saveWidgets([...activeLayout.widgets, next]);
    },
    [activeLayout, saveWidgets]
  );

  const removeWidget = useCallback(
    (id: string) => {
      if (!activeLayout) return;
      const remaining = activeLayout.widgets.filter((w) => w.id !== id);
      const compacted = compactWidgets(remaining);
      void saveWidgets(compacted);
    },
    [activeLayout, saveWidgets]
  );

  const updateLayoutFromGrid = useCallback(
    (widgets: WidgetInstanceDto[]) => {
      void saveWidgets(compactWidgets(widgets));
    },
    [saveWidgets]
  );

  const createLayout = useCallback(
    async (name: string, templateId?: string) => {
      const res = await fetch("/api/dashboard/layouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, templateId })
      });
      const j = await res.json();
      if (j.ok && j.layout) {
        await load();
        setActiveLayoutId(j.layout.id);
      }
    },
    [load]
  );

  return {
    layouts,
    activeLayout,
    activeLayoutId,
    setActiveLayoutId,
    loading,
    editMode,
    setEditMode,
    catalog,
    load,
    saveWidgets,
    addWidget,
    removeWidget,
    updateLayoutFromGrid,
    createLayout
  };
}

/** Vertical compact — no empty rows between widgets. */
export function compactWidgets(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
  if (!widgets.length) return widgets;
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  let cursorY = 0;
  return sorted.map((w, i) => {
    const next = { ...w, y: cursorY, sortOrder: i };
    cursorY += w.h;
    return next;
  });
}
