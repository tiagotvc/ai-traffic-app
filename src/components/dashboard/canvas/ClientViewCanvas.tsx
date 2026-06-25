"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { AppCanvasScopeProvider } from "@/components/dashboard/canvas/AppCanvasScopeContext";
import { ClientViewProvider } from "@/components/dashboard/canvas/ClientViewContext";
import { DashboardGrid } from "@/components/dashboard/canvas/DashboardGrid";
import { DashboardGridSkeleton } from "@/components/dashboard/canvas/DashboardGridSkeleton";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import { useClientViewDashboardData } from "@/uxpilot-ui/adapters/useClientViewDashboardData";

export function ClientViewCanvas({ token }: { token: string }) {
  const t = useTranslations("dashboardViews");
  const [layout, setLayout] = useState<LayoutDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardData = useClientViewDashboardData();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/views/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; layout?: LayoutDto; error?: string }) => {
        if (cancelled) return;
        if (j.ok && j.layout) {
          setLayout(j.layout);
          setError(null);
        } else {
          setLayout(null);
          setError(j.error ?? "not_found");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayout(null);
          setError("network");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="skeleton-shimmer mb-6 h-10 w-64 rounded-lg" />
        <DashboardGridSkeleton />
      </div>
    );
  }

  if (error || !layout) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-xl font-semibold" style={{ color: "var(--text-main)" }}>
          {t("notFoundTitle")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
          {t("notFoundHint")}
        </p>
      </div>
    );
  }

  const widgets = layout.widgets.filter((w) => w.visible);

  return (
    <ClientViewProvider viewToken={token} readOnly>
      <AppCanvasScopeProvider widgets={widgets}>
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <header className="mb-5 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
            {layout.clientName ? (
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#818cf8" }}>
                {layout.clientName}
              </p>
            ) : null}
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--text-main)" }}>
              {layout.name}
            </h1>
            {layout.subtitle ? (
              <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                {layout.subtitle}
              </p>
            ) : null}
          </header>

          <DashboardGrid
            widgets={widgets}
            editMode={false}
            allowResize={false}
            dashboardData={dashboardData}
            onLayoutChange={() => {}}
            onRemove={() => {}}
          />
        </div>
      </AppCanvasScopeProvider>
    </ClientViewProvider>
  );
}
