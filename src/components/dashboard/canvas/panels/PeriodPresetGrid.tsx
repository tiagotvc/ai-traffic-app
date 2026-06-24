"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import {
  EXTENDED_PERIOD_GROUPS,
  type ExtendedPeriodPreset
} from "@/lib/dashboard/extended-period";

export function PeriodPresetGrid({
  value,
  onChange
}: {
  value: ExtendedPeriodPreset;
  onChange: (preset: ExtendedPeriodPreset) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tPeriod = useTranslations("period");

  return (
    <div className="space-y-4">
      {EXTENDED_PERIOD_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t(group.labelKey)}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  value === preset
                    ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.1)] text-[#a78bfa]"
                    : "border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-dim)] hover:border-[rgba(124,58,237,0.25)]"
                )}
              >
                {tPeriod(preset as "last7")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
