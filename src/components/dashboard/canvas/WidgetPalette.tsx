"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Filter, Table2, Target, Users } from "lucide-react";

import type { PaletteBlockType } from "@/components/dashboard/canvas/BlockInsertModal";
import { cn } from "@/lib/cn";

const PALETTE_ITEMS = [
  { type: "app.table" as const, icon: Table2, color: "#0ea5e9" },
  { type: "app.analyze" as const, icon: BarChart3, color: "#7c3aed" },
  { type: "app.goal" as const, icon: Target, color: "#f59e0b" },
  { type: "app.filters" as const, icon: Filter, color: "#10b981" }
];

export function WidgetPalette({
  onPickBlock,
  onQuickAddWidget,
  className
}: {
  onPickBlock: (blockType: PaletteBlockType) => void;
  onQuickAddWidget?: (widgetType: string) => void;
  className?: string;
}) {
  const t = useTranslations("dashboardWidgets");

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-52 shrink-0 flex-col border-r",
        className
      )}
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--border-color)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("paletteTitle")}
        </p>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {PALETTE_ITEMS.map(({ type, icon: Icon, color }) => {
          const labelKey =
            type === "app.table"
              ? "paletteTable"
              : type === "app.analyze"
                ? "paletteChart"
                : type === "app.goal"
                  ? "paletteGoal"
                  : "paletteFilters";
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPickBlock(type)}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-[rgba(124,58,237,0.35)] hover:bg-[rgba(124,58,237,0.06)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ background: `${color}18`, color }}
              >
                <Icon size={15} />
              </span>
              {t(labelKey)}
            </button>
          );
        })}
        {onQuickAddWidget ? (
          <button
            type="button"
            onClick={() => onQuickAddWidget("analytics.ageBreakdown")}
            className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-[rgba(124,58,237,0.35)] hover:bg-[rgba(124,58,237,0.06)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ background: "rgba(14,165,233,0.12)", color: "#0ea5e9" }}
            >
              <Users size={15} />
            </span>
            {t("paletteAgeBreakdown")}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
