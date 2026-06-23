"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, LayoutTemplate, Plus, RotateCcw, Settings2, Sparkles, Wand2 } from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/canvas/DashboardEmptyState";
import { DashboardGrid } from "@/components/dashboard/canvas/DashboardGrid";
import { DashboardGridSkeleton } from "@/components/dashboard/canvas/DashboardGridSkeleton";
import { DashboardTemplatesModal } from "@/components/dashboard/canvas/DashboardTemplatesModal";
import {
  DashboardSwitcher,
  DashboardTvModeButton,
  WidgetLibraryModal
} from "@/components/dashboard/canvas/WidgetLibraryModal";
import { DashboardToolbarButton } from "@/components/dashboard/canvas/DashboardToolbarButton";
import { AiWidgetBuilderModal } from "@/components/dashboard/canvas/AiWidgetBuilderModal";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { layoutHasWidgetPeriodOverrides } from "@/lib/dashboard/widget-period";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function DashboardCanvas({
  activeLayout,
  editMode,
  setEditMode,
  catalog,
  isPlatformAdmin = false,
  limits,
  dashboardData,
  onLayoutChange,
  onRemoveWidget,
  onAddWidget,
  onWidgetConfigChange,
  saving = false,
  onResetLayout,
  resetting = false,
  layoutRevision = 0,
  onApplyTemplate,
  applyingTemplate = false,
  onAiWidgetCreated,
  actionError,
  onClearActionError,
  layouts,
  activeLayoutId,
  setActiveLayoutId,
  onCreateLayout,
  templates,
  layoutLoading = false
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
    minPlan?: string;
    requiredAddon?: string;
    isMasterBlaster?: boolean;
  }>;
  isPlatformAdmin?: boolean;
  limits: {
    maxDashboards: number;
    maxDashboardWidgets: number;
    allowResize: boolean;
    allowAiBuilder: boolean;
  };
  dashboardData: DashboardData;
  onLayoutChange: (widgets: LayoutDto["widgets"]) => void;
  onRemoveWidget: (id: string) => void;
  onAddWidget: (type: string, config?: Record<string, unknown>) => void;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
  saving?: boolean;
  onResetLayout?: () => Promise<{ ok: boolean; error?: string } | void>;
  resetting?: boolean;
  layoutRevision?: number;
  onApplyTemplate?: (templateId: string) => Promise<{ ok: boolean; error?: string } | void>;
  applyingTemplate?: boolean;
  onAiWidgetCreated?: (layout?: LayoutDto) => void;
  actionError?: string | null;
  onClearActionError?: () => void;
  layouts: LayoutDto[];
  activeLayoutId: string;
  setActiveLayoutId: (id: string) => void;
  onCreateLayout: (name: string, templateId?: string) => void;
  templates: Array<{ id: string; name: string; category?: string; widgets?: unknown }>;
  layoutLoading?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tDash = useTranslations("dashboard");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateConfirm, setTemplateConfirm] = useState<{ id: string; name: string } | null>(null);

  const widgets = activeLayout?.widgets ?? [];
  const isEmpty = !widgets.length;

  const hasWidgetPeriodOverrides = useMemo(
    () => layoutHasWidgetPeriodOverrides(widgets),
    [widgets]
  );

  useCommandStripPage({
    periodFilterDisabled: hasWidgetPeriodOverrides,
    periodFilterDisabledHint: hasWidgetPeriodOverrides ? t("periodFilterWidgetOverride") : undefined
  });

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
              {saving ? (
                <span className="ml-2" style={{ color: "#818cf8" }}>
                  · {t("savingLayout")}
                </span>
              ) : null}
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
            <DashboardToolbarButton
              icon={<LayoutTemplate size={14} />}
              label={t("templatesButton")}
              onClick={() => setTemplatesOpen(true)}
              disabled={applyingTemplate || saving}
              className="disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            />
            <DashboardToolbarButton
              icon={<RotateCcw size={14} />}
              label={t("resetLayout")}
              onClick={() => setResetConfirm(true)}
              disabled={resetting || saving}
              className="disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            />
            {limits.allowAiBuilder ? (
              <DashboardToolbarButton
                icon={<Wand2 size={14} />}
                label={t("aiBuilder")}
                onClick={() => setAiBuilderOpen(true)}
                className="transition hover:brightness-110"
                style={{
                  borderColor: "rgba(245,166,35,0.32)",
                  background: "linear-gradient(135deg, rgba(245,166,35,0.12), rgba(124,58,237,0.1))",
                  color: "#fde68a",
                  boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.14)"
                }}
              />
            ) : null}
            {editMode ? (
              <>
                <DashboardToolbarButton
                  icon={<Plus size={14} />}
                  label={t("addWidget")}
                  onClick={() => setLibraryOpen(true)}
                  className="text-white"
                  style={{ background: "#4f46e5", borderColor: "transparent" }}
                />
                <DashboardToolbarButton
                  icon={<Check size={14} />}
                  label={saving ? t("savingLayout") : t("doneEditing")}
                  disabled={saving}
                  onClick={() => {
                    if (saving) return;
                    setEditMode(false);
                  }}
                  className="disabled:opacity-50"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
                />
              </>
            ) : (
              <DashboardToolbarButton
                icon={<Settings2 size={14} />}
                label={tDash("layoutCustomize")}
                onClick={() => setEditMode(true)}
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              />
            )}
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="ui-alert-error flex items-center justify-between gap-3 text-sm">
          <span>{actionError}</span>
          <button type="button" className="ui-link text-xs" onClick={() => onClearActionError?.()}>
            {t("close")}
          </button>
        </div>
      ) : null}

      {dashboardData.note ? <div className="ui-alert-info">{dashboardData.note}</div> : null}

      {layoutLoading ? (
        <DashboardGridSkeleton />
      ) : isEmpty && editMode ? (
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
          onWidgetConfigChange={onWidgetConfigChange}
          layoutKey={layoutRevision}
        />
      )}

      <WidgetLibraryModal
        open={libraryOpen}
        catalog={catalog}
        isPlatformAdmin={isPlatformAdmin}
        dashboardData={dashboardData}
        onClose={() => setLibraryOpen(false)}
        onAdd={onAddWidget}
      />

      <AiWidgetBuilderModal
        open={aiBuilderOpen}
        layoutId={activeLayout?.id}
        onClose={() => setAiBuilderOpen(false)}
        onCreated={(layout) => {
          onAiWidgetCreated?.(layout);
          setEditMode(true);
        }}
      />

      <DashboardTemplatesModal
        open={templatesOpen}
        templates={templates}
        applying={applyingTemplate}
        onClose={() => setTemplatesOpen(false)}
        onApply={(id) => {
          const tpl = templates.find((x) => x.id === id);
          if (tpl) {
            setTemplateConfirm({ id: tpl.id, name: tpl.name });
          }
        }}
      />

      {templateConfirm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-xl"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
              {t("templateApplyTitle")}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
              {t("templateApplyHint", { name: templateConfirm.name })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateConfirm(null)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {t("configCancel")}
              </button>
              <button
                type="button"
                disabled={applyingTemplate}
                onClick={() => {
                  void (async () => {
                    const id = templateConfirm.id;
                    setTemplateConfirm(null);
                    setTemplatesOpen(false);
                    await onApplyTemplate?.(id);
                  })();
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#4f46e5" }}
              >
                {applyingTemplate ? t("templateApplying") : t("templateApplyConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-xl"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
              {t("resetLayoutTitle")}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
              {t("resetLayoutHint")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {t("configCancel")}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => {
                  void (async () => {
                    setResetConfirm(false);
                    await onResetLayout?.();
                  })();
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#dc2626" }}
              >
                {resetting ? t("resetLayoutRunning") : t("resetLayoutConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
