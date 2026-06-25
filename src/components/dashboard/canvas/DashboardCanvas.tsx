"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Move, Settings2, Sparkles, Check } from "lucide-react";

import { AppCanvasShell } from "@/components/dashboard/canvas/AppCanvasShell";
import { BuilderCanvasToolbar } from "@/components/dashboard/canvas/BuilderCanvasToolbar";
import { AppCanvasScopeProvider } from "@/components/dashboard/canvas/AppCanvasScopeContext";
import { DashboardTvModeButton } from "@/components/dashboard/canvas/DashboardSwitcher";
import { DashboardToolbarActions } from "@/components/dashboard/canvas/DashboardToolbarActions";
import { DashboardGrid } from "@/components/dashboard/canvas/DashboardGrid";
import { DashboardGridSkeleton } from "@/components/dashboard/canvas/DashboardGridSkeleton";
import { DashboardTemplatesModal } from "@/components/dashboard/canvas/DashboardTemplatesModal";
import { layoutHasWidgetPeriodOverrides } from "@/lib/dashboard/widget-period";
import { HIGHLIGHTS_LAYOUT_EDITOR_V2 } from "@/lib/dashboard/highlights-layout-flags";
import { cn } from "@/lib/cn";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { PageToolbar } from "@/components/layout/PageToolbar";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";

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
  onUpdateLayoutMeta,
  onPublishLayout,
  publishingLayout = false,
  templates,
  layoutLoading = false,
  className,
  onEnterEditMode,
  highlightsMode = false,
  highlightsSubtitle,
  onOpenSectionCustomize,
  onFinalizeHighlightsLayout
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
  onAddWidget: (type: string, config?: Record<string, unknown>) => string | void;
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
  onUpdateLayoutMeta?: (patch: { name?: string; subtitle?: string | null }) => void;
  onPublishLayout?: (published: boolean) => Promise<void>;
  publishingLayout?: boolean;
  templates: Array<{ id: string; name: string; category?: string; widgets?: unknown }>;
  layoutLoading?: boolean;
  className?: string;
  onEnterEditMode?: () => void;
  /** Destaques home — drag/resize canvas with filters, no templates/publish. */
  highlightsMode?: boolean;
  highlightsSubtitle?: ReactNode;
  /** Opens section/metrics modal (Destaques personalize). */
  onOpenSectionCustomize?: () => void;
  /** Compact + persist Destaques layout before leaving organize mode. */
  onFinalizeHighlightsLayout?: () => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tDash = useTranslations("dashboard");
  const isMobile = useIsMobile();
  const highlightsEditEnabled = highlightsMode && HIGHLIGHTS_LAYOUT_EDITOR_V2;
  const effectiveEditMode = editMode && !isMobile && (!highlightsMode || highlightsEditEnabled);
  const highlightsInlineEdit = highlightsEditEnabled && effectiveEditMode;
  const builderFullBleed = effectiveEditMode && !highlightsMode;
  const [tvMode, setTvMode] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateConfirm, setTemplateConfirm] = useState<{ id: string; name: string } | null>(null);

  const widgets = activeLayout?.widgets ?? [];

  const hasWidgetPeriodOverrides = useMemo(
    () => layoutHasWidgetPeriodOverrides(widgets),
    [widgets]
  );

  useCommandStripPage(highlightsMode ? {} : { hideFilters: true, hideSync: true });

  const finishHighlightsOrganize = () => {
    if (saving) return;
    onFinalizeHighlightsLayout?.();
    setEditMode(false);
  };

  const toolbarSubtitle =
    saving ? (
      <span style={{ color: "#818cf8" }}>{t("savingLayout")}</span>
    ) : undefined;

  const content = (
    <div
      className={cn(
        "flex flex-1 flex-col",
        !highlightsMode && "h-full min-h-0 overflow-hidden"
      )}
    >
      {!tvMode ? (
        builderFullBleed ? (
          <BuilderCanvasToolbar
            appName={highlightsMode ? tDash("highlights") : (activeLayout?.name ?? t("defaultDashboard"))}
            appSubtitle={highlightsMode ? null : (activeLayout?.subtitle ?? null)}
            editMode={effectiveEditMode}
            saving={saving}
            published={highlightsMode ? false : activeLayout?.published}
            viewToken={highlightsMode ? null : activeLayout?.viewToken}
            publishing={publishingLayout}
            highlightsMode={highlightsMode}
            onUpdateAppMeta={
              highlightsMode
                ? undefined
                : (patch) => {
                    if (activeLayout?.id) onUpdateLayoutMeta?.(patch);
                  }
            }
            onTvToggle={() => setTvMode((v) => !v)}
            onDoneEditing={() => {
              if (saving) return;
              setEditMode(false);
            }}
            onCustomize={() => (onEnterEditMode ? onEnterEditMode() : setEditMode(true))}
            onPublishToggle={
              highlightsMode || !onPublishLayout
                ? undefined
                : (published) => void onPublishLayout(published)
            }
          />
        ) : (
          <PageToolbar
            icon={
              highlightsMode ? (
                <Sparkles size={16} />
              ) : (
                <LayoutGrid size={16} />
              )
            }
            title={
              highlightsMode ? (
                tDash("highlights")
              ) : (
                <div>
                  <h1 className="font-heading text-xl font-bold sm:text-2xl" style={{ color: "var(--text-main)" }}>
                    {activeLayout?.name ?? t("defaultDashboard")}
                  </h1>
                  {activeLayout?.subtitle ? (
                    <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                      {activeLayout.subtitle}
                    </p>
                  ) : null}
                </div>
              )
            }
            subtitle={
              highlightsMode
                ? effectiveEditMode
                  ? tDash("layoutOrganizeHint")
                  : highlightsSubtitle ?? tDash("highlightsSubtitle")
                : toolbarSubtitle
            }
            showGlobalFilters={highlightsMode && !effectiveEditMode}
            showSync={highlightsMode && !effectiveEditMode}
            actions={
              !isMobile ? (
                highlightsMode ? (
                  effectiveEditMode ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={finishHighlightsOrganize}
                      className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
                    >
                      <Check size={14} />
                      {saving ? t("savingLayout") : tDash("layoutDoneOrganize")}
                    </button>
                  ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenSectionCustomize?.()}
                      className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                    >
                      <Settings2 size={14} />
                      {tDash("layoutCustomize")}
                    </button>
                    {HIGHLIGHTS_LAYOUT_EDITOR_V2 ? (
                      <button
                        type="button"
                        onClick={() => (onEnterEditMode ? onEnterEditMode() : setEditMode(true))}
                        className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
                        style={{
                          borderColor: "var(--ui-accent-border)",
                          background: "var(--ui-accent-muted)",
                          color: "var(--ui-accent)"
                        }}
                      >
                        <Move size={14} />
                        {tDash("layoutOrganize")}
                      </button>
                    ) : null}
                  </div>
                  )
                ) : (
                  <DashboardToolbarActions
                    appBuilderMode
                    saving={saving}
                    appName={activeLayout?.name}
                    appSubtitle={activeLayout?.subtitle ?? null}
                    onUpdateAppMeta={(patch) => {
                      if (activeLayout?.id) onUpdateLayoutMeta?.(patch);
                    }}
                    onTvToggle={() => setTvMode((v) => !v)}
                    onTemplatesOpen={() => setTemplatesOpen(true)}
                    onAddWidget={() => {}}
                    onDoneEditing={() => {
                      if (saving) return;
                      setEditMode(false);
                    }}
                    onCustomize={() => (onEnterEditMode ? onEnterEditMode() : setEditMode(true))}
                    editMode={false}
                    hasWidgetPeriodOverrides={hasWidgetPeriodOverrides}
                    published={activeLayout?.published}
                    viewToken={activeLayout?.viewToken}
                    publishing={publishingLayout}
                    onPublishToggle={
                      onPublishLayout ? (published) => void onPublishLayout(published) : undefined
                    }
                  />
                )
              ) : undefined
            }
          />
        )
      ) : null}

      {actionError ? (
        <div
          className={cn(
            "ui-alert-error flex shrink-0 items-center justify-between gap-3 text-sm",
            builderFullBleed ? "mx-4 mt-2" : "mx-4 mt-2"
          )}
        >
          <span>{actionError}</span>
          <button type="button" className="ui-link text-xs" onClick={() => onClearActionError?.()}>
            {t("close")}
          </button>
        </div>
      ) : null}

      {dashboardData.note && !effectiveEditMode ? (
        <div className="ui-alert-info mx-4 mt-2 shrink-0">{dashboardData.note}</div>
      ) : null}

      <div className={cn(!highlightsMode && "min-h-0 flex-1 overflow-hidden")}>
        <AppCanvasShell
          widgets={widgets}
          editMode={effectiveEditMode && !tvMode}
          allowResize={limits.allowResize}
          dashboardData={dashboardData}
          layoutLoading={layoutLoading}
          layoutRevision={layoutRevision}
          highlightsMode={highlightsMode}
          highlightsShell={highlightsMode && !effectiveEditMode}
          onLayoutChange={onLayoutChange}
          onRemoveWidget={onRemoveWidget}
          onAddWidget={onAddWidget}
          onWidgetConfigChange={onWidgetConfigChange}
        />
      </div>

      {!highlightsMode ? (
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
      ) : null}

      {!highlightsMode && templateConfirm ? (
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
    </div>
  );

  if (tvMode) {
    const tvName = activeLayout?.name ?? t("defaultDashboard");
    const tvSubtitle = activeLayout?.subtitle;
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--surface-bg)] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-bold" style={{ color: "var(--text-main)" }}>
              {tvName}
            </h1>
            {tvSubtitle ? (
              <p className="mt-1 truncate text-sm" style={{ color: "var(--text-dim)" }}>
                {tvSubtitle}
              </p>
            ) : null}
          </div>
          <DashboardTvModeButton onToggle={() => setTvMode(false)} />
        </div>
        {actionError ? (
          <div className="ui-alert-error mb-4 flex items-center justify-between gap-3 text-sm">
            <span>{actionError}</span>
            <button type="button" className="ui-link text-xs" onClick={() => onClearActionError?.()}>
              {t("close")}
            </button>
          </div>
        ) : null}
        {dashboardData.note ? <div className="ui-alert-info mb-4">{dashboardData.note}</div> : null}
        <AppCanvasScopeProvider widgets={widgets}>
          {layoutLoading ? (
            <DashboardGridSkeleton />
          ) : (
            <DashboardGrid
              widgets={widgets}
              editMode={false}
              allowResize={limits.allowResize}
              dashboardData={dashboardData}
              onLayoutChange={onLayoutChange}
              onRemove={onRemoveWidget}
              onWidgetConfigChange={onWidgetConfigChange}
              layoutKey={layoutRevision}
            />
          )}
        </AppCanvasScopeProvider>
      </div>
    );
  }

  return <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{content}</div>;
}
