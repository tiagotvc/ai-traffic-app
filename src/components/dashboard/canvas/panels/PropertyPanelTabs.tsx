"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

export type PropertyPanelTab = "content" | "style";

export function PropertyPanelTabs({
  tab,
  onTabChange,
  showStyle = true
}: {
  tab: PropertyPanelTab;
  onTabChange: (tab: PropertyPanelTab) => void;
  showStyle?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");

  const tabs: Array<{ id: PropertyPanelTab; label: string }> = [
    { id: "content", label: t("panelTabContent") },
    ...(showStyle ? [{ id: "style" as const, label: t("panelTabStyle") }] : [])
  ];

  return (
    <div
      className="flex shrink-0 gap-0.5 border-b p-1"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
    >
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
            tab === item.id
              ? "bg-[var(--surface-card)] text-[#a78bfa] shadow-sm"
              : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
