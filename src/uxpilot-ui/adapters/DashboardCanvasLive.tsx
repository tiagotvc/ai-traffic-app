"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { DashboardCanvas } from "@/components/dashboard/canvas/DashboardCanvas";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import { useDashboardCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

export function DashboardCanvasLive() {
  const t = useTranslations("dashboard");
  const data = useDashboardData();
  const canvas = useDashboardCanvas();
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [limits, setLimits] = useState({
    maxDashboards: 3,
    maxDashboardWidgets: 20,
    allowResize: true,
    allowAiBuilder: false
  });

  useEffect(() => {
    void fetch("/api/dashboard/templates")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.templates)) {
          setTemplates(j.templates.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
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

  if (canvas.loading || data.loading) {
    return (
      <main className="flex-1 px-4 py-5 md:px-6">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          {t("loadingMetrics")}
        </p>
      </main>
    );
  }

  if (data.isEmptyState) {
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
    <main
      className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
      <DashboardCanvas
        activeLayout={canvas.activeLayout}
        editMode={canvas.editMode}
        setEditMode={canvas.setEditMode}
        catalog={canvas.catalog}
        limits={limits}
        dashboardData={data}
        onLayoutChange={canvas.updateLayoutFromGrid}
        onRemoveWidget={canvas.removeWidget}
        onAddWidget={canvas.addWidget}
        layouts={canvas.layouts}
        activeLayoutId={canvas.activeLayoutId}
        setActiveLayoutId={canvas.setActiveLayoutId}
        onCreateLayout={canvas.createLayout}
        templates={templates}
      />
    </main>
  );
}
