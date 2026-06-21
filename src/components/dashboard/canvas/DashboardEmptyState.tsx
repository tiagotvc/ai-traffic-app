"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, Plus } from "lucide-react";

export function DashboardEmptyState({ onAddWidget }: { onAddWidget: () => void }) {
  const t = useTranslations("dashboardWidgets");

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "rgba(79,70,229,0.12)" }}
      >
        <LayoutGrid size={22} style={{ color: "#818cf8" }} />
      </div>
      <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
        {t("emptyTitle")}
      </h3>
      <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--text-dim)" }}>
        {t("emptyHint")}
      </p>
      <button
        type="button"
        onClick={onAddWidget}
        className="mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
        style={{ background: "var(--accent-primary, #4f46e5)" }}
      >
        <Plus size={16} />
        {t("addWidget")}
      </button>
    </div>
  );
}
