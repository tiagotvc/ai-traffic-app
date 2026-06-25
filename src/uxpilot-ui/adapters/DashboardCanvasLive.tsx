"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { DashboardCanvas } from "@/components/dashboard/canvas/DashboardCanvas";
import { ViewBuilderBootScreen } from "@/components/dashboard/canvas/ViewBuilderBootScreen";
import { useAppBuilderImmersive } from "@/components/dashboard/canvas/AppBuilderChromeContext";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import { useDashboardCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";
import { useRouter, usePathname } from "@/i18n/navigation";

const BOOT_MIN_MS = 520;

export function DashboardCanvasLive({ appId }: { appId: string }) {
  const t = useTranslations("dashboard");
  const tWidgets = useTranslations("dashboardWidgets");
  const data = useDashboardData();
  const searchParams = useSearchParams();
  const startInEditMode = searchParams.get("edit") === "1";
  const canvas = useDashboardCanvas(appId, { startInEditMode });
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [bootingEdit, setBootingEdit] = useState(startInEditMode);
  const bootStartedAtRef = useRef(startInEditMode ? Date.now() : 0);
  const wantsEditShell = (canvas.editMode || startInEditMode || bootingEdit) && !isMobile;
  useAppBuilderImmersive(wantsEditShell);
  const [resetting, setResetting] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [publishingLayout, setPublishingLayout] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; category?: string; widgets?: unknown }>
  >([]);
  const [limits, setLimits] = useState({
    maxDashboards: 3,
    maxDashboardWidgets: 20,
    allowResize: true,
    allowAiBuilder: false
  });

  const finishBoot = useCallback(() => {
    const elapsed = Date.now() - bootStartedAtRef.current;
    const wait = Math.max(0, BOOT_MIN_MS - elapsed);
    window.setTimeout(() => setBootingEdit(false), wait);
  }, []);

  const enterEditMode = useCallback(() => {
    bootStartedAtRef.current = Date.now();
    setBootingEdit(true);
    canvas.setEditMode(true);
    if (searchParams.get("edit") !== "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("edit", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [canvas, pathname, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("edit") === "1" && !canvas.loading && canvas.activeLayout) {
      canvas.setEditMode(true);
    }
  }, [searchParams, canvas.loading, canvas.activeLayout, canvas.setEditMode]);

  useEffect(() => {
    if (!canvas.loading && canvas.activeLayout && canvas.activeLayout.widgets.length === 0) {
      bootStartedAtRef.current = Date.now();
      setBootingEdit(true);
      canvas.setEditMode(true);
    }
  }, [canvas.loading, canvas.activeLayout, canvas.setEditMode]);

  useEffect(() => {
    if (!bootingEdit) return;
    if (!canvas.loading && canvas.activeLayout) {
      finishBoot();
    }
  }, [bootingEdit, canvas.loading, canvas.activeLayout, finishBoot]);

  useEffect(() => {
    if (!canvas.loading && canvas.layouts.length && !canvas.activeLayout) {
      router.replace("/dashboard/views");
    }
  }, [canvas.loading, canvas.layouts.length, canvas.activeLayout, router]);

  useEffect(() => {
    void fetch("/api/dashboard/templates")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.templates)) {
          setTemplates(
            j.templates.map(
              (x: { id: string; name: string; category?: string; widgets?: unknown }) => ({
                id: x.id,
                name: x.name,
                category: x.category,
                widgets: x.widgets
              })
            )
          );
        }
      })
      .catch(() => {});
    void fetch("/api/dashboard/catalog")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.limits) setLimits(j.limits);
      })
      .catch(() => {});
  }, []);

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

  const showBootScreen = bootingEdit && !isMobile;
  const bootVariant =
    !canvas.activeLayout || canvas.activeLayout.widgets.length === 0 ? "building" : "opening";

  return (
    <>
      {showBootScreen ? <ViewBuilderBootScreen variant={bootVariant} /> : null}
      <div
        data-app-builder-shell
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          wantsEditShell ? "h-full min-h-0 overflow-hidden" : "space-y-4 px-4 py-5 md:px-6",
          showBootScreen && "invisible"
        )}
        aria-hidden={showBootScreen}
      >
        <DashboardCanvas
          className={wantsEditShell ? "h-full min-h-0 flex-1" : undefined}
          layoutLoading={canvas.loading}
          activeLayout={canvas.activeLayout}
          editMode={canvas.editMode}
          setEditMode={canvas.setEditMode}
          onEnterEditMode={enterEditMode}
        catalog={canvas.catalog}
        isPlatformAdmin={canvas.isPlatformAdmin}
        limits={limits}
        dashboardData={data}
        onLayoutChange={canvas.updateLayoutFromGrid}
        onRemoveWidget={canvas.removeWidget}
        onAddWidget={canvas.addWidget}
        onWidgetConfigChange={canvas.updateWidgetConfig}
        saving={canvas.saving}
        layoutRevision={canvas.layoutRevision}
        resetting={resetting}
        applyingTemplate={applyingTemplate}
        actionError={actionError}
        onClearActionError={() => setActionError(null)}
        onResetLayout={async () => {
          setResetting(true);
          setActionError(null);
          const result = await canvas.resetLayoutToDefault();
          setResetting(false);
          if (!result.ok) {
            setActionError(tWidgets("resetLayoutError"));
          }
        }}
        onApplyTemplate={async (templateId) => {
          setApplyingTemplate(true);
          setActionError(null);
          const result = await canvas.applyTemplate(templateId);
          setApplyingTemplate(false);
          if (!result.ok) {
            setActionError(tWidgets("templateApplyError"));
          }
        }}
        onAiWidgetCreated={(layout) => {
          if (layout) {
            canvas.applyLayoutUpdate(layout);
          } else {
            void canvas.reloadLayouts();
          }
        }}
        onUpdateLayoutMeta={(patch) => {
          if (canvas.activeLayoutId) {
            void canvas.updateLayoutMeta(canvas.activeLayoutId, patch);
          }
        }}
        onPublishLayout={async (published) => {
          if (!canvas.activeLayoutId) return;
          setPublishingLayout(true);
          await canvas.updateLayoutMeta(canvas.activeLayoutId, { published });
          setPublishingLayout(false);
        }}
        publishingLayout={publishingLayout}
        templates={templates}
      />
      </div>
    </>
  );
}
