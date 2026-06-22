"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultWidgetConfig,
  resolveWidgetHeight,
  resolveWidgetWidth
} from "@/lib/dashboard/widget-config";
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
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [catalog, setCatalog] = useState<
    Array<{
      type: string;
      titleKey: string;
      category: string;
      allowed: boolean;
      comingSoon?: boolean;
      isAiWidget?: boolean;
      minPlan?: string;
      requiredAddon?: string;
      isMasterBlaster?: boolean;
    }>
  >([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [layoutRevision, setLayoutRevision] = useState(0);

  const reloadLayouts = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/layouts");
      const j = await res.json();
      if (j.ok && Array.isArray(j.layouts)) {
        setLayouts(j.layouts);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const saveVersionRef = useRef(0);
  const activeLayoutIdRef = useRef(activeLayoutId);
  activeLayoutIdRef.current = activeLayoutId;

  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) ?? layouts.find((l) => l.isDefault) ?? layouts[0],
    [layouts, activeLayoutId]
  );

  const applyLocalWidgets = useCallback((layoutId: string, widgets: WidgetInstanceDto[]) => {
    setLayouts((cur) =>
      cur.map((l) => (l.id === layoutId ? { ...l, widgets } : l))
    );
  }, []);

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
        setIsPlatformAdmin(!!cJson.isPlatformAdmin);
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
    async (widgets: WidgetInstanceDto[], layoutId?: string) => {
      const id = layoutId ?? activeLayoutIdRef.current;
      if (!id) return;

      applyLocalWidgets(id, widgets);

      const version = ++saveVersionRef.current;
      setSaving(true);
      try {
        const res = await fetch(`/api/dashboard/layouts/${id}/widgets`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ widgets })
        });
        const j = await res.json();
        if (version !== saveVersionRef.current) return;
        if (j.ok && j.layout) {
          setLayouts((cur) => cur.map((l) => (l.id === j.layout.id ? j.layout : l)));
        }
      } catch {
        /* ignore */
      } finally {
        if (version === saveVersionRef.current) setSaving(false);
      }
    },
    [applyLocalWidgets]
  );

  const addWidget = useCallback(
    (widgetType: string, config: Record<string, unknown> = {}) => {
      const layout = layouts.find((l) => l.id === activeLayoutIdRef.current);
      if (!layout) return;
      const def = getWidgetDefinition(widgetType);
      if (!def) return;

      const mergedConfig = { ...defaultWidgetConfig(widgetType), ...config };
      const maxY = layout.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
      const next: WidgetInstanceDto = {
        id: `new-${Date.now()}`,
        layoutId: layout.id,
        widgetType,
        title: null,
        x: 0,
        y: maxY,
        w: resolveWidgetWidth(widgetType, mergedConfig),
        h: resolveWidgetHeight(widgetType, mergedConfig),
        size: def.size,
        visible: true,
        config: mergedConfig,
        sortOrder: layout.widgets.length
      };
      void saveWidgets([...layout.widgets, next], layout.id);
    },
    [layouts, saveWidgets]
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const layout = layouts.find((l) => l.id === activeLayoutIdRef.current);
      if (!layout) return;
      void saveWidgets(
        layout.widgets.filter((w) => w.id !== widgetId),
        layout.id
      );
    },
    [layouts, saveWidgets]
  );

  const widgetSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const updateWidgetConfig = useCallback(
    (widgetId: string, configPatch: Record<string, unknown>) => {
      const layoutId = activeLayoutIdRef.current;
      const layout = layouts.find((l) => l.id === layoutId);
      if (!layout) return;

      const widgets = layout.widgets.map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, ...configPatch } } : w
      );
      applyLocalWidgets(layoutId, widgets);

      const prev = widgetSaveTimers.current.get(widgetId);
      if (prev) clearTimeout(prev);
      widgetSaveTimers.current.set(
        widgetId,
        setTimeout(() => {
          void saveWidgets(widgets, layoutId);
          widgetSaveTimers.current.delete(widgetId);
        }, 450)
      );
    },
    [layouts, applyLocalWidgets, saveWidgets]
  );

  const updateLayoutFromGrid = useCallback(
    (widgets: WidgetInstanceDto[]) => {
      void saveWidgets(widgets, activeLayoutIdRef.current);
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

  const resetLayoutToDefault = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const layoutId = activeLayoutIdRef.current;
    if (!layoutId) return { ok: false, error: "no_layout" };

    const version = ++saveVersionRef.current;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/layouts/${layoutId}/reset`, { method: "POST" });
      const j = await res.json();
      if (j.ok && j.layout) {
        await reloadLayouts();
        setLayoutRevision((v) => v + 1);
        return { ok: true };
      }
      if (version !== saveVersionRef.current) return { ok: false, error: "stale" };
      return { ok: false, error: (j.error as string) ?? "reset_failed" };
    } catch {
      return { ok: false, error: "network" };
    } finally {
      if (version === saveVersionRef.current) setSaving(false);
    }
  }, [reloadLayouts]);

  const applyTemplate = useCallback(
    async (templateId: string): Promise<{ ok: boolean; error?: string }> => {
      const layoutId = activeLayoutIdRef.current;
      if (!layoutId) return { ok: false, error: "no_layout" };

      const version = ++saveVersionRef.current;
      setSaving(true);
      try {
        const res = await fetch(`/api/dashboard/layouts/${layoutId}/apply-template`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId })
        });
        const j = await res.json();
        if (j.ok && j.layout) {
          await reloadLayouts();
          setLayoutRevision((v) => v + 1);
          return { ok: true };
        }
        if (version !== saveVersionRef.current) return { ok: false, error: "stale" };
        return { ok: false, error: (j.error as string) ?? "apply_failed" };
      } catch {
        return { ok: false, error: "network" };
      } finally {
        if (version === saveVersionRef.current) setSaving(false);
      }
    },
    [reloadLayouts]
  );

  return {
    layouts,
    activeLayout,
    activeLayoutId,
    setActiveLayoutId,
    loading,
    saving,
    editMode,
    setEditMode,
    catalog,
    isPlatformAdmin,
    load,
    saveWidgets,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    updateLayoutFromGrid,
    createLayout,
    resetLayoutToDefault,
    applyTemplate,
    layoutRevision
  };
}
