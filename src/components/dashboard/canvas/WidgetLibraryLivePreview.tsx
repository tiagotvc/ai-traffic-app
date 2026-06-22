"use client";

import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import { WidgetLibraryThumbnail } from "@/components/dashboard/canvas/WidgetLibraryThumbnail";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const PREVIEW_W = 480;
const PREVIEW_H = 168;

export function WidgetLibraryLivePreview({
  widgetType,
  titleKey,
  config: configProp,
  dashboardData,
  isPremium = false
}: {
  widgetType: string;
  titleKey?: string;
  config?: Record<string, unknown>;
  dashboardData?: DashboardData;
  isPremium?: boolean;
}) {
  const config = configProp ?? defaultWidgetConfig(widgetType);

  if (!dashboardData || dashboardData.loading) {
    return (
      <WidgetLibraryThumbnail widgetType={widgetType} config={config} isPremium={isPremium} />
    );
  }

  return (
    <div
      className="library-preview-frame relative h-full w-full overflow-hidden rounded-lg"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
        border: isPremium ? "1px solid rgba(245,158,11,0.18)" : "1px solid rgba(148,163,184,0.22)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          width: PREVIEW_W,
          height: PREVIEW_H,
          transform: "scale(0.56)",
          transformOrigin: "top left"
        }}
      >
        <WidgetLivePreview
          widgetType={widgetType}
          titleKey={titleKey}
          config={config}
          dashboardData={dashboardData}
          previewHeight={PREVIEW_H}
          compact
        />
      </div>
    </div>
  );
}
