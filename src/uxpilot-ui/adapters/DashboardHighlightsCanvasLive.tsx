"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";

import { DashboardCustomizeModal } from "@/components/dashboard/DashboardCustomizeModal";
import { DashboardCanvas } from "@/components/dashboard/canvas/DashboardCanvas";
import {
  applyDashboardPrefsToWidgets,
  highlightsCanvasNeedsReseed
} from "@/lib/dashboard/highlights-widget-sync";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { useDefaultDashboardCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";
import { prepareHighlightsLayoutWidgets } from "@/lib/dashboard/highlights-layout-widgets";
import { HIGHLIGHTS_LAYOUT_EDITOR_V2 } from "@/lib/dashboard/highlights-layout-flags";

export function DashboardHighlightsCanvasLive() {
  const t = useTranslations("dashboard");
  const data = useDashboardData();
  const canvas = useDefaultDashboardCanvas();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const reseedAttemptedRef = useRef(false);

  const enterEditMode = useCallback(() => {
    if (!HIGHLIGHTS_LAYOUT_EDITOR_V2) return;
    canvas.setEditMode(true);
  }, [canvas]);

  useEffect(() => {
    if (!HIGHLIGHTS_LAYOUT_EDITOR_V2 && canvas.editMode) {
      canvas.setEditMode(false);
    }
  }, [canvas.editMode, canvas.setEditMode]);

  useEffect(() => {
    if (canvas.resolving || canvas.loading || reseedAttemptedRef.current) return;
    if (!canvas.activeLayout || canvas.activeLayout.widgets.length > 0) return;
    reseedAttemptedRef.current = true;
    void canvas.resetLayoutToDefault();
  }, [canvas.resolving, canvas.loading, canvas.activeLayout, canvas.resetLayoutToDefault]);

  if (!data.loading && data.isEmptyState) {
    return (
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ConnectAccountCard />
          <div
            className="flex flex-col gap-4 rounded-2xl border p-6"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
          >
            <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
              {t("emptyStateTitle")}
            </h3>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DashboardCanvas
        highlightsMode
        layoutLoading={canvas.resolving}
        activeLayout={canvas.activeLayout}
        editMode={canvas.editMode}
        setEditMode={canvas.setEditMode}
        onEnterEditMode={enterEditMode}
        onOpenSectionCustomize={() => setCustomizeOpen(true)}
        catalog={canvas.catalog}
        isPlatformAdmin={canvas.isPlatformAdmin}
        limits={canvas.limits}
        dashboardData={data}
        onLayoutChange={canvas.updateLayoutFromGrid}
        onRemoveWidget={canvas.removeWidget}
        onAddWidget={canvas.addWidget}
        onWidgetConfigChange={canvas.updateWidgetConfig}
        saving={canvas.saving}
        layoutRevision={canvas.layoutRevision}
        resetting={resetting}
        actionError={actionError}
        onClearActionError={() => setActionError(null)}
        templates={[]}
        highlightsSubtitle={
          !data.isEmptyState ? (
            <>
              <span>{t("highlightsSubtitle")}</span>
              <span
                className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor: "var(--chart-frame-border)",
                  background: "var(--chart-frame-bg)",
                  color: "var(--text-dim)"
                }}
              >
                <Calendar size={10} />
                {data.periodLabel}
              </span>
            </>
          ) : (
            t("highlightsSubtitle")
          )
        }
        onResetLayout={async () => {
          setResetting(true);
          setActionError(null);
          const result = await canvas.resetLayoutToDefault();
          setResetting(false);
          if (!result.ok) setActionError(t("loadError"));
        }}
        onFinalizeHighlightsLayout={() => {
          canvas.finalizeHighlightsLayout(data.dashboardLayout.heroMetrics);
        }}
      />

      <DashboardCustomizeModal
        open={customizeOpen}
        layout={data.dashboardLayout}
        chartMetrics={data.chartMetrics}
        onClose={() => setCustomizeOpen(false)}
        onApply={(next) => {
          data.persistDashboardCustomization(next);
          const widgets = canvas.activeLayout?.widgets ?? [];
          if (
            highlightsCanvasNeedsReseed(widgets, next.layout) ||
            widgets.length === 0
          ) {
            void canvas.resetLayoutToDefault();
          } else {
            canvas.updateLayoutFromGrid(
              prepareHighlightsLayoutWidgets(
                applyDashboardPrefsToWidgets(widgets, next.layout, next.chartMetrics),
                next.layout.heroMetrics
              )
            );
          }
          setCustomizeOpen(false);
        }}
      />
    </div>
  );
}
