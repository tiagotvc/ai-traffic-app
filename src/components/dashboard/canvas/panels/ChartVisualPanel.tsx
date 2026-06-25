"use client";

import { useTranslations } from "next-intl";

import { BuilderColorInput, BuilderField, BuilderSelect } from "@/components/dashboard/canvas/WidgetBuilderUi";
import type { SlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

export function ChartVisualPanel({
  visual,
  metricKeys,
  onChange
}: {
  visual: SlotVisualConfig;
  metricKeys: MetricKey[];
  onChange: (patch: Partial<SlotVisualConfig>) => void;
}) {
  const t = useTranslations("dashboardWidgets");

  return (
    <div className="space-y-4">
      <BuilderField label={t("legendShow")}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={visual.showLegend !== false}
            onChange={(e) => onChange({ showLegend: e.target.checked })}
            className="rounded border-[var(--border-color)]"
          />
          {t("legendShowHint")}
        </label>
      </BuilderField>

      {visual.showLegend !== false ? (
        <>
          <BuilderField label={t("legendPosition")}>
            <BuilderSelect
              value={visual.legendPosition ?? "bottom"}
              onChange={(v) => onChange({ legendPosition: v as SlotVisualConfig["legendPosition"] })}
              options={[
                { value: "top", label: t("legendPosTop") },
                { value: "bottom", label: t("legendPosBottom") },
                { value: "left", label: t("legendPosLeft") },
                { value: "right", label: t("legendPosRight") }
              ]}
            />
          </BuilderField>
          <BuilderField label={t("legendIconType")}>
            <BuilderSelect
              value={visual.legendIconType ?? "circle"}
              onChange={(v) => onChange({ legendIconType: v as SlotVisualConfig["legendIconType"] })}
              options={[
                { value: "circle", label: t("legendIconCircle") },
                { value: "square", label: t("legendIconSquare") },
                { value: "line", label: t("legendIconLine") }
              ]}
            />
          </BuilderField>
        </>
      ) : null}

      <BuilderColorInput
        label={t("configAxisColor")}
        value={visual.textColor ?? ""}
        onChange={(textColor) => onChange({ textColor: textColor || undefined })}
      />

      {metricKeys.map((key) => (
        <BuilderColorInput
          key={key}
          label={t("configSeriesColor", { metric: key })}
          value={visual.customColors?.[key] ?? METRIC_CATALOG.find((m) => m.key === key)?.color ?? ""}
          onChange={(color) =>
            onChange({
              customColors: { ...visual.customColors, [key]: color || undefined }
            })
          }
        />
      ))}
    </div>
  );
}
