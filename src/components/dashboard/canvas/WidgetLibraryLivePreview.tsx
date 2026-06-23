"use client";

import { WidgetLibraryThumbnail } from "@/components/dashboard/canvas/WidgetLibraryThumbnail";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";

export function WidgetLibraryLivePreview({
  widgetType,
  config: configProp,
  isPremium = false
}: {
  widgetType: string;
  titleKey?: string;
  config?: Record<string, unknown>;
  isPremium?: boolean;
}) {
  const config = configProp ?? defaultWidgetConfig(widgetType);

  return (
    <WidgetLibraryThumbnail widgetType={widgetType} config={config} isPremium={isPremium} />
  );
}
