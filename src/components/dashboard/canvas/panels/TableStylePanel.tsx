"use client";

import { useTranslations } from "next-intl";

import { BuilderField, BuilderSegment } from "@/components/dashboard/canvas/WidgetBuilderUi";
import { cn } from "@/lib/cn";
import type {
  TableBlockConfig,
  TableBorderRadius,
  TableDensity,
  TableHeaderStyle,
  TableRowStriping,
  TableStylePreset,
  TableTextAlign
} from "@/lib/dashboard/app-block-config";
import { TABLE_STYLE_PRESETS } from "@/lib/dashboard/table-style-presets";

export function TableStylePanel({
  config,
  onPatch,
  featured = false
}: {
  config: TableBlockConfig;
  onPatch: (patch: Partial<TableBlockConfig>) => void;
  featured?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("panelTableStyle")}
        </p>
        <div className={cn("grid gap-2", featured ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
          {(Object.keys(TABLE_STYLE_PRESETS) as TableStylePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPatch({ tableStyle: preset })}
              className={cn(
                "rounded-lg border p-2 text-left transition-colors",
                featured && "p-3",
                (config.tableStyle ?? "striped") === preset
                  ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)] ring-1 ring-[rgba(124,58,237,0.25)]"
                  : "border-[var(--border-color)] hover:border-[rgba(124,58,237,0.25)]"
              )}
            >
              <TableStylePreview preset={preset} large={featured} />
              <span
                className={cn(
                  "mt-1 block font-semibold text-[var(--text-main)]",
                  featured ? "text-xs" : "text-[10px]"
                )}
              >
                {t(TABLE_STYLE_PRESETS[preset].labelKey)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("panelTableRowStriping")}
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["off", "zebra", "custom"] as TableRowStriping[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPatch({ rowStriping: mode })}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[10px] font-semibold",
                (config.rowStriping ?? "zebra") === mode
                  ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)] text-[#a78bfa]"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              )}
            >
              {t(`rowStriping_${mode}`)}
            </button>
          ))}
        </div>
        {(config.rowStriping ?? "zebra") !== "off" ? (
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label={t("panelTableRowColorOdd")}
              value={config.rowColorOdd ?? "#ffffff"}
              onChange={(rowColorOdd) => onPatch({ rowColorOdd })}
            />
            <ColorField
              label={t("panelTableRowColorEven")}
              value={config.rowColorEven ?? "#f1f5f9"}
              onChange={(rowColorEven) => onPatch({ rowColorEven })}
            />
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ColorField
            label={t("panelTableHoverRowColor")}
            value={config.hoverRowColor ?? "#f8fafc"}
            onChange={(hoverRowColor) => onPatch({ hoverRowColor })}
          />
          <ColorField
            label={t("panelTableBorderColor")}
            value={config.borderColor ?? "#e2e8f0"}
            onChange={(borderColor) => onPatch({ borderColor })}
          />
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("panelTableHeaderColors")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label={t("panelTableHeaderBg")}
            value={config.headerBgColor ?? "#f8fafc"}
            onChange={(headerBgColor) => onPatch({ headerBgColor })}
          />
          <ColorField
            label={t("panelTableHeaderText")}
            value={config.headerTextColor ?? "#64748b"}
            onChange={(headerTextColor) => onPatch({ headerTextColor })}
          />
        </div>
      </section>

      <section>
        <BuilderField label={t("panelTableDensity")}>
          <BuilderSegment
            value={config.density ?? "default"}
            onChange={(v) => onPatch({ density: v as TableDensity })}
            options={[
              { value: "compact", label: t("densityCompact") },
              { value: "default", label: t("densityDefault") },
              { value: "comfortable", label: t("densityComfortable") }
            ]}
          />
        </BuilderField>
      </section>

      <section>
        <BuilderField label={t("panelTableTextAlign")}>
          <BuilderSegment
            value={config.textAlign ?? "left"}
            onChange={(v) => onPatch({ textAlign: v as TableTextAlign })}
            options={[
              { value: "left", label: t("alignLeft") },
              { value: "center", label: t("alignCenter") },
              { value: "right", label: t("alignRight") }
            ]}
          />
        </BuilderField>
      </section>

      <section>
        <BuilderField label={t("panelTableBorderRadius")}>
          <div className="grid grid-cols-4 gap-2">
            {(["none", "sm", "md", "lg"] as TableBorderRadius[]).map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => onPatch({ borderRadius: radius })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                  (config.borderRadius ?? "md") === radius
                    ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)]"
                    : "border-[var(--border-color)] hover:border-[rgba(124,58,237,0.25)]"
                )}
              >
                <span
                  className={cn(
                    "block h-8 w-full border-2 border-[var(--border-color)] bg-[var(--surface-bg)]",
                    radius === "none" && "rounded-none",
                    radius === "sm" && "rounded-sm",
                    radius === "md" && "rounded-lg",
                    radius === "lg" && "rounded-2xl"
                  )}
                />
                <span className="text-[10px] font-semibold text-[var(--text-dim)]">
                  {t(`borderRadius_${radius}`)}
                </span>
              </button>
            ))}
          </div>
        </BuilderField>
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.showTitle !== false}
            onChange={(e) => onPatch({ showTitle: e.target.checked })}
          />
          {t("panelTableShowTitle")}
        </label>
        {config.showTitle !== false ? (
          <input
            type="text"
            value={config.title ?? ""}
            onChange={(e) => onPatch({ title: e.target.value || undefined })}
            placeholder={t("panelTableTitlePlaceholder")}
            className="ui-input w-full text-sm"
          />
        ) : null}
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.showHeader !== false}
            onChange={(e) => onPatch({ showHeader: e.target.checked })}
          />
          {t("panelTableShowHeader")}
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.stickyHeader !== false}
            onChange={(e) => onPatch({ stickyHeader: e.target.checked })}
          />
          {t("panelTableStickyHeader")}
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.showRowBorders !== false}
            onChange={(e) => onPatch({ showRowBorders: e.target.checked })}
          />
          {t("panelTableRowBorders")}
        </label>
      </section>

      {config.showHeader !== false ? (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("panelTableHeaderStyle")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["default", "accent", "dark"] as TableHeaderStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onPatch({ headerStyle: style })}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[10px] font-semibold capitalize",
                  (config.headerStyle ?? "default") === style
                    ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)] text-[#a78bfa]"
                    : "border-[var(--border-color)] text-[var(--text-dim)]"
                )}
              >
                {t(`tableHeaderStyle_${style}`)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-[var(--text-main)]">
      <span className="mb-1 block text-[10px] font-medium text-[var(--text-dimmer)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-[var(--border-color)] bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ui-input min-w-0 flex-1 font-mono text-xs"
        />
      </div>
    </label>
  );
}

function TableStylePreview({ preset, large = false }: { preset: TableStylePreset; large?: boolean }) {
  const tokens = TABLE_STYLE_PRESETS[preset].tokens;
  return (
    <div
      className={cn(
        "overflow-hidden rounded border",
        large ? "text-[8px]" : "text-[6px]",
        tokens.wrapper
      )}
    >
      <div className={cn("flex gap-px", tokens.headerRow)}>
        <div className={cn("flex-1", tokens.headerCell)}>A</div>
        <div className={cn("flex-1", tokens.headerCell)}>B</div>
      </div>
      <div className={tokens.bodyRow}>
        <div className="flex gap-px">
          <div className={cn("flex-1", tokens.bodyCell)}>1</div>
          <div className={cn("flex-1", tokens.bodyCell)}>2</div>
        </div>
      </div>
    </div>
  );
}
