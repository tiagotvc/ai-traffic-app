"use client";

import { useTranslations } from "next-intl";

import { BuilderField } from "@/components/dashboard/canvas/WidgetBuilderUi";
import type { PropertyPanelTab } from "@/components/dashboard/canvas/panels/PropertyPanelTabs";
import { cn } from "@/lib/cn";
import type { FilterBlockConfig, FilterLayoutStyle } from "@/lib/dashboard/app-block-config";

export function FilterPropertyPanel({
  config,
  onPatch,
  tab = "content"
}: {
  config: FilterBlockConfig;
  onPatch: (patch: Partial<FilterBlockConfig>) => void;
  tab?: PropertyPanelTab;
}) {
  const t = useTranslations("dashboardWidgets");

  if (tab === "style") {
    return (
      <div className="space-y-4">
        <BuilderField label={t("filterLayoutStyle")}>
          <div className="grid gap-2">
            {(["bar", "card"] as FilterLayoutStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onPatch({ layoutStyle: style })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs font-medium",
                  (config.layoutStyle ?? "bar") === style
                    ? "border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.08)] text-emerald-500"
                    : "border-[var(--border-color)] text-[var(--text-dim)]"
                )}
              >
                {t(`filterLayout_${style}`)}
              </button>
            ))}
          </div>
        </BuilderField>
      </div>
    );
  }

  const toggles: Array<{ key: keyof FilterBlockConfig; label: string }> = [
    { key: "showClient", label: t("filterPanelClient") },
    { key: "showAccount", label: t("filterPanelAccount") },
    { key: "showPeriod", label: t("filterPanelPeriod") },
    { key: "showSearch", label: t("filterPanelSearch") },
    { key: "showPreset", label: t("filterPanelPreset") }
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-dim)]">{t("filterPanelHint")}</p>
      <BuilderField label={t("filterPanelControls")}>
        <div className="space-y-2">
          {toggles.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs text-[var(--text-main)]">
              <input
                type="checkbox"
                checked={
                  key === "showSearch" || key === "showPreset"
                    ? config[key] === true
                    : config[key] !== false
                }
                onChange={(e) => onPatch({ [key]: e.target.checked } as Partial<FilterBlockConfig>)}
              />
              {label}
            </label>
          ))}
        </div>
      </BuilderField>
    </div>
  );
}
