"use client";

import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";

import { AppScopeFiltersBar } from "@/components/dashboard/canvas/widgets/AppScopeFiltersBar";
import { useClientViewOptional } from "@/components/dashboard/canvas/ClientViewContext";
import { cn } from "@/lib/cn";
import type { FilterBlockConfig } from "@/lib/dashboard/app-block-config";

export function FilterBlockWidget({
  config,
  onConfigChange
}: {
  config: Record<string, unknown>;
  onConfigChange?: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const clientView = useClientViewOptional();
  const cfg = config as FilterBlockConfig;
  const readOnly = clientView?.readOnly === true;

  function patch(p: Partial<FilterBlockConfig>) {
    if (readOnly) return;
    onConfigChange?.(p);
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col justify-center px-1 py-1",
        cfg.layoutStyle === "card" && "rounded-lg border bg-[var(--surface-card)] px-3 py-2"
      )}
      style={cfg.layoutStyle === "card" ? { borderColor: "var(--border-color)" } : undefined}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        <Filter size={12} />
        {t("filterBlockLabel")}
      </div>
      <AppScopeFiltersBar config={cfg} onPatch={patch} readOnly={readOnly} />
    </div>
  );
}
