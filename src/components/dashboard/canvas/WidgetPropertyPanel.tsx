"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { FilterPropertyPanel } from "@/components/dashboard/canvas/panels/FilterPropertyPanel";
import {
  PropertyPanelTabs,
  type PropertyPanelTab
} from "@/components/dashboard/canvas/panels/PropertyPanelTabs";
import {
  AnalyzePropertyPanel,
  GoalPropertyPanel,
  TablePropertyPanel
} from "@/components/dashboard/canvas/panels/TablePropertyPanel";
import { cn } from "@/lib/cn";
import {
  widgetConfigToAppBlock,
  type FilterBlockConfig,
  type TableBlockConfig
} from "@/lib/dashboard/app-block-config";
import { getWidgetDefinition, type WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

export function WidgetPropertyPanel({
  widget,
  onPatch,
  onClose,
  className
}: {
  widget: WidgetInstanceDto | null;
  onPatch: (widgetId: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
  className?: string;
}) {
  const t = useTranslations("dashboardWidgets");
  const [tab, setTab] = useState<PropertyPanelTab>("content");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; patch: Record<string, unknown> } | null>(null);

  useEffect(() => {
    setTab("style");
  }, [widget?.id]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const debouncedPatch = useCallback(
    (widgetId: string, patch: Record<string, unknown>) => {
      pendingRef.current = {
        id: widgetId,
        patch: { ...(pendingRef.current?.id === widgetId ? pendingRef.current.patch : {}), ...patch }
      };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) {
          onPatch(pendingRef.current.id, pendingRef.current.patch);
          pendingRef.current = null;
        }
      }, 450);
    },
    [onPatch]
  );

  if (!widget) {
    return (
      <aside
        className={cn("flex h-full min-h-0 w-80 shrink-0 flex-col border-l", className)}
        style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <p className="text-xs text-[var(--text-dim)]">{t("panelEmptyHint")}</p>
        </div>
      </aside>
    );
  }

  const def = getWidgetDefinition(widget.widgetType);
  const title = def ? t(def.titleKey) : widget.widgetType;
  const blockConfig = widgetConfigToAppBlock(widget.widgetType, widget.config);
  const hasStyleTab = blockConfig?.intent !== undefined;

  return (
    <aside
      className={cn("flex h-full min-h-0 w-80 shrink-0 flex-col border-l", className)}
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b px-3 py-2"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("panelTitle")}
          </p>
          <p className="truncate text-sm font-semibold text-[var(--text-main)]">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-[var(--surface-bg)]"
          aria-label={t("close")}
        >
          <X size={14} style={{ color: "var(--text-dimmer)" }} />
        </button>
      </div>

      {hasStyleTab ? <PropertyPanelTabs tab={tab} onTabChange={setTab} /> : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
        {blockConfig?.intent === "table" ? (
          <TablePropertyPanel
            config={blockConfig as TableBlockConfig}
            tab={tab}
            onPatch={(patch) => debouncedPatch(widget.id, patch)}
          />
        ) : blockConfig?.intent === "analyze" ? (
          <AnalyzePropertyPanel
            config={widget.config}
            tab={tab}
            onPatch={(patch) => debouncedPatch(widget.id, patch)}
          />
        ) : blockConfig?.intent === "goal" ? (
          <GoalPropertyPanel
            config={widget.config}
            onPatch={(patch) => debouncedPatch(widget.id, patch)}
          />
        ) : blockConfig?.intent === "filters" ? (
          <FilterPropertyPanel
            config={blockConfig as FilterBlockConfig}
            tab={tab}
            onPatch={(patch) => debouncedPatch(widget.id, patch)}
          />
        ) : (
          <p className="text-xs text-[var(--text-dim)]">{t("panelUnsupported")}</p>
        )}
      </div>
    </aside>
  );
}
