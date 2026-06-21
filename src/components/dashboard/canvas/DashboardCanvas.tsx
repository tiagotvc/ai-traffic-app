"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, Settings2, Sparkles, Wand2 } from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/canvas/DashboardEmptyState";
import { DashboardGrid } from "@/components/dashboard/canvas/DashboardGrid";
import {
  DashboardSwitcher,
  DashboardTvModeButton,
  WidgetLibraryModal
} from "@/components/dashboard/canvas/WidgetLibraryModal";
import { AiWidgetBuilderModal } from "@/components/dashboard/canvas/AiWidgetBuilderModal";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function DashboardCanvas({
  activeLayout,
  editMode,
  setEditMode,
  catalog,
  limits,
  dashboardData,
  onLayoutChange,
  onRemoveWidget,
  onAddWidget,
  layouts,
  activeLayoutId,
  setActiveLayoutId,
  onCreateLayout,
  templates
}: {
  activeLayout: LayoutDto | undefined;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  catalog: Array<{
    type: string;
    titleKey: string;
    category: string;
    allowed: boolean;
    comingSoon?: boolean;
    isAiWidget?: boolean;
  }>;
  limits: {
    maxDashboards: number;
    maxDashboardWidgets: number;
    allowResize: boolean;
    allowAiBuilder: boolean;
  };
  dashboardData: DashboardData;
  onLayoutChange: (widgets: LayoutDto["widgets"]) => void;
  onRemoveWidget: (id: string) => void;
  onAddWidget: (type: string) => void;
  layouts: LayoutDto[];
  activeLayoutId: string;
  setActiveLayoutId: (id: string) => void;
  onCreateLayout: (name: string, templateId?: string) => void;
  templates: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("dashboardWidgets");
  const tDash = useTranslations("dashboard");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const widgets = activeLayout?.widgets ?? [];
  const isEmpty = !widgets.length;

  const content = (
    <>
      {!tvMode ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "rgba(245,166,35,0.15)" }}
              >
                <Sparkles size={16} style={{ color: "#f5a623" }} />
              </div>
              <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
                {tDash("highlights")}
              </h1>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              {t("canvasSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardSwitcher
              layouts={layouts}
              activeLayoutId={activeLayoutId}
              onSelect={setActiveLayoutId}
              onCreate={onCreateLayout}
              templates={templates}
              maxDashboards={limits.maxDashboards}
            />
            <DashboardTvModeButton onToggle={() => setTvMode((v) => !v)} />
            {limits.allowAiBuilder ? (
              <button
                type="button"
                onClick={() => setAiBuilderOpen(true)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "#7c3aed" }}
              >
                <Wand2 size={14} />
                {t("aiBuilder")}
              </button>
            ) : null}
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                  style={{ background: "#4f46e5" }}
                >
                  <Plus size={14} />
                  {t("addWidget")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
                >
                  <Check size={14} />
                  {t("doneEditing")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                <Settings2 size={14} />
                {tDash("layoutCustomize")}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {dashboardData.note ? <div className="ui-alert-info">{dashboardData.note}</div> : null}

      {isEmpty && editMode ? (
        <DashboardEmptyState onAddWidget={() => setLibraryOpen(true)} />
      ) : isEmpty ? (
        <DashboardEmptyState onAddWidget={() => setEditMode(true)} />
      ) : (
        <DashboardGrid
          widgets={widgets}
          editMode={editMode && !tvMode}
          allowResize={limits.allowResize}
          dashboardData={dashboardData}
          onLayoutChange={onLayoutChange}
          onRemove={onRemoveWidget}
        />
      )}

      <WidgetLibraryModal
        open={libraryOpen}
        catalog={catalog}
        onClose={() => setLibraryOpen(false)}
        onAdd={onAddWidget}
      />

      <AiWidgetBuilderModal
        open={aiBuilderOpen}
        layoutId={activeLayout?.id}
        onClose={() => setAiBuilderOpen(false)}
        onCreated={() => setEditMode(true)}
      />
    </>
  );

  if (tvMode) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--surface-bg)] p-6">
        <div className="mb-4 flex justify-end">
          <DashboardTvModeButton onToggle={() => setTvMode(false)} />
        </div>
        {content}
      </div>
    );
  }

  return content;
}
