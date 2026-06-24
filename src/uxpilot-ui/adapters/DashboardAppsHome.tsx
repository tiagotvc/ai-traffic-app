"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LayoutGrid } from "lucide-react";

import { ViewsPlanUpsell } from "@/components/dashboard/canvas/ViewsPlanUpsell";
import { AppCanvasPlaceholder } from "@/components/dashboard/canvas/AppCanvasPlaceholder";
import { AppGallery } from "@/components/dashboard/canvas/AppGallery";
import { ViewBuilderBootScreen } from "@/components/dashboard/canvas/ViewBuilderBootScreen";
import { PageToolbar } from "@/components/layout/PageToolbar";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import { useEntitlementsCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { openViewEditor } from "@/lib/dashboard/view-editor-navigation";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import type { AppLocale } from "@/i18n/routing";

export function DashboardAppsHome({ initialAllowCanvas }: { initialAllowCanvas: boolean }) {
  const t = useTranslations("dashboardApps");
  const locale = useLocale() as AppLocale;
  const allowCanvas = useEntitlementsCanvas(initialAllowCanvas);
  const data = useDashboardData();
  const [layouts, setLayouts] = useState<LayoutDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [buildingView, setBuildingView] = useState(false);
  const [maxApps, setMaxApps] = useState(3);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; slug: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, cRes, tRes, clientsRes] = await Promise.all([
        fetch("/api/dashboard/layouts"),
        fetch("/api/dashboard/catalog"),
        fetch("/api/dashboard/templates"),
        fetch("/api/clients/cards?period=last30")
      ]);
      const lJson = await lRes.json();
      const cJson = await cRes.json();
      const tJson = await tRes.json();
      const clientsJson = await clientsRes.json();
      if (lJson.ok && Array.isArray(lJson.layouts)) setLayouts(lJson.layouts);
      if (cJson.ok && cJson.limits?.maxDashboards) setMaxApps(cJson.limits.maxDashboards);
      if (tJson.ok && Array.isArray(tJson.templates)) {
        setTemplates(tJson.templates.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      }
      if (clientsJson.clients && Array.isArray(clientsJson.clients)) {
        setClients(
          clientsJson.clients.map((c: { id: string; slug: string; name: string }) => ({
            id: c.id,
            slug: c.slug,
            name: c.name
          }))
        );
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowCanvas) void load();
  }, [allowCanvas, load]);

  const createApp = useCallback(async (): Promise<void> => {
    setCreating(true);
    setBuildingView(true);
    try {
      const res = await fetch("/api/dashboard/layouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: t("defaultAppName") })
      });
      const j = await res.json();
      if (j.ok && j.layout?.id) {
        openViewEditor(j.layout.id, locale);
        setBuildingView(false);
        void load();
      } else {
        setBuildingView(false);
      }
    } catch {
      setBuildingView(false);
    } finally {
      setCreating(false);
    }
  }, [load, locale, t]);

  const deleteApp = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/dashboard/layouts/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const j = await res.json();
      if (j.ok && Array.isArray(j.layouts)) {
        setLayouts(j.layouts);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, []);

  if (!allowCanvas) {
    return <ViewsPlanUpsell />;
  }

  if (!data.loading && data.isEmptyState) {
    return (
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ConnectAccountCard />
        </div>
      </main>
    );
  }

  const atLimit = maxApps > 0 && layouts.length >= maxApps;
  const isEmpty = !loading && layouts.length === 0;

  return (
    <>
      {buildingView ? <ViewBuilderBootScreen variant="building" /> : null}
      <main
        className="flex flex-1 flex-col space-y-4 overflow-y-auto px-4 py-5 md:px-6"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        aria-hidden={buildingView}
      >
      {isEmpty ? (
        <>
          <PageToolbar
            icon={<LayoutGrid size={16} style={{ color: "#818cf8" }} />}
            title={
              <h1 className="font-heading text-xl font-bold sm:text-2xl" style={{ color: "var(--text-main)" }}>
                {t("galleryTitle")}
              </h1>
            }
            showGlobalFilters={false}
            showSync={false}
          />
          <AppCanvasPlaceholder
            variant="gallery"
            onAction={() => void createApp()}
            submitting={creating}
            actionDisabled={atLimit}
            className="flex-1"
          />
        </>
      ) : (
        <AppGallery
          layouts={layouts}
          loading={loading}
          maxApps={maxApps}
          templates={templates}
          clients={clients}
          allowCreate={allowCanvas}
          onCreateApp={async (name, options) => {
            setBuildingView(true);
            try {
              const res = await fetch("/api/dashboard/layouts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  name: name || undefined,
                  templateId: options?.templateId,
                  clientId: options?.clientId
                })
              });
              const j = await res.json();
              if (j.ok && j.layout?.id) {
                openViewEditor(j.layout.id, locale);
                setBuildingView(false);
                void load();
                return j.layout.id as string;
              }
              setBuildingView(false);
            } catch {
              setBuildingView(false);
            }
            return null;
          }}
          onDeleteApp={deleteApp}
        />
      )}
      </main>
    </>
  );
}
