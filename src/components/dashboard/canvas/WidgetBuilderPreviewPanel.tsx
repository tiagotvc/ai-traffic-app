"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function WidgetBuilderPreviewPanel({
  children,
  className,
  minHeight = 160,
  maxHeight,
  scrollable = false
}: {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  scrollable?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");

  return (
    <div className={className} style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}>
      <p
        className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-dimmer)" }}
      >
        {t("configPreview")}
      </p>
      <div
        className={cn("rounded-lg", scrollable && "overflow-y-auto overflow-x-hidden")}
        style={{
          minHeight,
          maxHeight: scrollable ? maxHeight : undefined
        }}
      >
        {children}
      </div>
    </div>
  );
}
