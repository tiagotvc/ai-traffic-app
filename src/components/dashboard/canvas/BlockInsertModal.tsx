"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Filter, Table2, Target, X } from "lucide-react";

import { FilterPropertyPanel } from "@/components/dashboard/canvas/panels/FilterPropertyPanel";
import {
  PropertyPanelTabs,
  type PropertyPanelTab
} from "@/components/dashboard/canvas/panels/PropertyPanelTabs";
import {
  AnalyzePropertyPanel,
  GoalPropertyPanel,
  TablePropertyPanel
} from "@/components/dashboard/canvas/panels/TablePropertyPanel";
import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import { cn } from "@/lib/cn";
import {
  appBlockConfigToWidget,
  defaultAnalyzeConfig,
  defaultFilterConfig,
  defaultGoalConfig,
  defaultTableConfig,
  type AppBlockConfig,
  type FilterBlockConfig,
  type TableBlockConfig
} from "@/lib/dashboard/app-block-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

export type PaletteBlockType = "app.table" | "app.analyze" | "app.goal" | "app.filters";

type DashboardData = ReturnType<typeof useDashboardData>;

const BLOCK_META: Record<
  PaletteBlockType,
  { icon: typeof Table2; color: string; titleKey: string }
> = {
  "app.table": { icon: Table2, color: "#0ea5e9", titleKey: "insertModalTitle_table" },
  "app.analyze": { icon: BarChart3, color: "#7c3aed", titleKey: "insertModalTitle_analyze" },
  "app.goal": { icon: Target, color: "#f59e0b", titleKey: "insertModalTitle_goal" },
  "app.filters": { icon: Filter, color: "#10b981", titleKey: "insertModalTitle_filters" }
};

function defaultConfigFor(type: PaletteBlockType): AppBlockConfig {
  switch (type) {
    case "app.table":
      return defaultTableConfig();
    case "app.analyze":
      return defaultAnalyzeConfig();
    case "app.goal":
      return defaultGoalConfig();
    case "app.filters":
      return defaultFilterConfig();
  }
}

export function BlockInsertModal({
  blockType,
  dashboardData,
  onClose,
  onConfirm
}: {
  blockType: PaletteBlockType | null;
  dashboardData: DashboardData;
  onClose: () => void;
  onConfirm: (widgetType: string, config: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [tab, setTab] = useState<PropertyPanelTab>("style");
  const [config, setConfig] = useState<AppBlockConfig | null>(null);

  useEffect(() => {
    if (!blockType) {
      setConfig(null);
      return;
    }
    setConfig(defaultConfigFor(blockType));
    setTab("style");
  }, [blockType]);

  const preview = useMemo(() => {
    if (!config) return null;
    return appBlockConfigToWidget(config);
  }, [config]);

  if (!blockType || !config || !preview) return null;

  const meta = BLOCK_META[blockType];
  const Icon = meta.icon;
  const showStyleTab = blockType !== "app.goal";

  const patchConfig = (patch: Partial<AppBlockConfig>) => {
    setConfig((cur) => (cur ? ({ ...cur, ...patch } as AppBlockConfig) : cur));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-insert-title"
    >
      <div
        className="flex max-h-[min(88vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${meta.color}18`, color: meta.color }}
              >
                <Icon size={18} />
              </span>
              <div>
                <h2
                  id="block-insert-title"
                  className="font-heading text-lg font-bold"
                  style={{ color: "var(--text-main)" }}
                >
                  {t(meta.titleKey)}
                </h2>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {t("insertModalHint")}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--surface-bg)]"
            aria-label={t("close")}
          >
            <X size={16} style={{ color: "var(--text-dimmer)" }} />
          </button>
        </header>

        <PropertyPanelTabs tab={tab} onTabChange={setTab} showStyle={showStyleTab} />

        <div className="min-h-0 flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          <div
            className="mb-5 overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
          >
            <div className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("insertModalPreview")}
            </div>
            <div className="h-40 p-2">
              <WidgetLivePreview
                widgetType={preview.widgetType}
                config={preview.config}
                dashboardData={dashboardData}
                previewHeight={150}
              />
            </div>
          </div>

          <div className={cn(tab === "style" && "block-insert-style-hero")}>
            {config.intent === "table" ? (
              <TablePropertyPanel
                config={config as TableBlockConfig}
                tab={tab}
                featuredStyle
                onPatch={patchConfig}
              />
            ) : config.intent === "analyze" ? (
              <AnalyzePropertyPanel
                config={preview.config}
                tab={tab}
                onPatch={patchConfig}
              />
            ) : config.intent === "goal" ? (
              <GoalPropertyPanel config={preview.config} onPatch={patchConfig} />
            ) : config.intent === "filters" ? (
              <FilterPropertyPanel
                config={config as FilterBlockConfig}
                tab={tab}
                onPatch={patchConfig}
              />
            ) : null}
          </div>
        </div>

        <footer
          className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            {t("configCancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              const { widgetType, config: widgetConfig } = appBlockConfigToWidget(config);
              onConfirm(widgetType, widgetConfig);
            }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#4f46e5" }}
          >
            {t("insertModalConfirm")}
          </button>
        </footer>
      </div>
    </div>
  );
}
