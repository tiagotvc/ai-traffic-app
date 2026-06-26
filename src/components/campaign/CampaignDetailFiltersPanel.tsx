"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { cn } from "@/lib/cn";

/** Painel de filtros colapsável — abaixo do subtítulo nas telas internas de campanha. */
export function CampaignDetailFiltersPanel({
  children,
  className,
  defaultOpen = false
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-2", className)}>
      <FilterToggleButton
        open={open}
        showLabel={t("showFilters")}
        hideLabel={t("hideFilters")}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? (
        <div
          className="ui-filter-panel-grid rounded-xl border p-3 text-xs [&_button]:py-1.5 [&_button]:text-xs"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
