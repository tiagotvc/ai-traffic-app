"use client";

import { createContext, useContext, useMemo } from "react";

import type { ExtendedPeriodPreset } from "@/lib/dashboard/extended-period";
import { defaultFilterConfig, type FilterBlockConfig } from "@/lib/dashboard/app-block-config";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

export type AppCanvasScope = {
  clientFilter: string;
  accountFilter: string;
  periodPreset: ExtendedPeriodPreset | null;
  searchQuery: string;
  presetFilter: string;
  hasFilterBlock: boolean;
};

const AppCanvasScopeContext = createContext<AppCanvasScope>({
  clientFilter: "",
  accountFilter: "",
  periodPreset: null,
  searchQuery: "",
  presetFilter: "",
  hasFilterBlock: false
});

export function AppCanvasScopeProvider({
  widgets,
  children
}: {
  widgets: WidgetInstanceDto[];
  children: React.ReactNode;
}) {
  const scope = useMemo(() => resolveScopeFromWidgets(widgets), [widgets]);
  return (
    <AppCanvasScopeContext.Provider value={scope}>{children}</AppCanvasScopeContext.Provider>
  );
}

export function useAppCanvasScope(): AppCanvasScope {
  return useContext(AppCanvasScopeContext);
}

function resolveScopeFromWidgets(widgets: WidgetInstanceDto[]): AppCanvasScope {
  const filterWidget = widgets.find((w) => w.widgetType === "app.filters" && w.visible);
  if (!filterWidget) {
    return {
      clientFilter: "",
      accountFilter: "",
      periodPreset: null,
      searchQuery: "",
      presetFilter: "",
      hasFilterBlock: false
    };
  }

  const cfg = filterWidget.config as Partial<FilterBlockConfig>;
  const defaults = defaultFilterConfig();

  return {
    clientFilter: cfg.clientFilter ?? defaults.clientFilter ?? "",
    accountFilter: cfg.accountFilter ?? defaults.accountFilter ?? "",
    periodPreset: cfg.showPeriod !== false ? (cfg.periodPreset ?? defaults.periodPreset ?? "last30") : null,
    searchQuery: cfg.showSearch ? (cfg.searchQuery ?? "") : "",
    presetFilter: cfg.showPreset ? (cfg.presetFilter ?? "") : "",
    hasFilterBlock: true
  };
}
