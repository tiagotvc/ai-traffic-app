"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator, ChevronDown, ChevronUp, GripVertical, Plus } from "lucide-react";

import {
  BuilderField,
  BuilderMetricPicker,
  BuilderSelect
} from "@/components/dashboard/canvas/WidgetBuilderUi";
import { cn } from "@/lib/cn";
import type {
  TableBlockConfig,
  TableColumnDef,
  TableColumnFormat,
  TableColumnFormula
} from "@/lib/dashboard/app-block-config";
import {
  columnLabel,
  createCalculatedColumn,
  createMetricColumn,
  metricsRequiredForColumns,
  normalizeTableColumnDefs,
  patchTableColumnDefs
} from "@/lib/dashboard/table-column-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

const FORMATS: TableColumnFormat[] = ["auto", "currency", "number", "percent", "integer", "decimal"];

const FORMULA_KINDS: Array<{ kind: TableColumnFormula["kind"]; labelKey: string }> = [
  { kind: "divide", labelKey: "tableFormulaDivide" },
  { kind: "multiply", labelKey: "tableFormulaMultiply" },
  { kind: "subtract", labelKey: "tableFormulaSubtract" },
  { kind: "ratio_percent", labelKey: "tableFormulaRatioPercent" },
  { kind: "custom", labelKey: "tableFormulaCustom" }
];

export function TableColumnsPanel({
  config,
  onPatch
}: {
  config: TableBlockConfig;
  onPatch: (patch: Partial<TableBlockConfig>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");
  const columnDefs = normalizeTableColumnDefs(config);
  const [addingCalc, setAddingCalc] = useState(false);
  const [calcDraft, setCalcDraft] = useState<{
    label: string;
    kind: TableColumnFormula["kind"];
    a: MetricKey;
    b: MetricKey;
    expression: string;
    format: TableColumnFormat;
  }>({
    label: "",
    kind: "divide",
    a: "spend",
    b: "conversions",
    expression: "spend / conversions",
    format: "decimal"
  });

  const updateDefs = (defs: TableColumnDef[]) => {
    onPatch(patchTableColumnDefs(config, defs));
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const next = [...columnDefs];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    updateDefs(next);
  };

  const updateColumn = (id: string, patch: Partial<TableColumnDef>) => {
    updateDefs(columnDefs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeColumn = (id: string) => {
    const next = columnDefs.filter((c) => c.id !== id);
    if (!next.length) return;
    updateDefs(next);
  };

  const addMetricColumn = (key: MetricKey) => {
    if (columnDefs.some((c) => c.id === key)) return;
    updateDefs([...columnDefs, createMetricColumn(key)]);
  };

  const addCalculatedColumn = () => {
    let formula: TableColumnFormula;
    if (calcDraft.kind === "custom") {
      formula = { kind: "custom", expression: calcDraft.expression.trim() };
    } else if (calcDraft.kind === "divide") {
      formula = { kind: "divide", numerator: calcDraft.a, denominator: calcDraft.b };
    } else if (calcDraft.kind === "ratio_percent") {
      formula = { kind: "ratio_percent", numerator: calcDraft.a, denominator: calcDraft.b };
    } else if (calcDraft.kind === "multiply") {
      formula = { kind: "multiply", left: calcDraft.a, right: calcDraft.b };
    } else {
      formula = { kind: "subtract", left: calcDraft.a, right: calcDraft.b };
    }

    const col = createCalculatedColumn({
      label: calcDraft.label.trim() || undefined,
      formula,
      format: calcDraft.format
    });
    updateDefs([...columnDefs, col]);
    setAddingCalc(false);
  };

  const sortOptions = [
    { value: "name", label: t("wizardTableColName") },
    ...columnDefs.map((c) => ({ value: c.id, label: columnLabel(c, tMetrics) }))
  ];

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("panelTableColumns")}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setAddingCalc((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
              style={{ borderColor: "var(--border-color)", color: "#a78bfa" }}
            >
              <Calculator size={11} />
              {t("tableAddCalculated")}
            </button>
          </div>
        </div>

        {addingCalc ? (
          <div
            className="mb-3 space-y-2 rounded-lg border p-3"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
          >
            <BuilderField label={t("tableCalcLabel")}>
              <input
                value={calcDraft.label}
                onChange={(e) => setCalcDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder={t("tableCalcLabelPlaceholder")}
                className="ui-input w-full text-sm"
              />
            </BuilderField>
            <BuilderField label={t("tableCalcOperation")}>
              <BuilderSelect
                value={calcDraft.kind}
                onChange={(v) => setCalcDraft((d) => ({ ...d, kind: v as TableColumnFormula["kind"] }))}
                options={FORMULA_KINDS.map((f) => ({ value: f.kind, label: t(f.labelKey) }))}
              />
            </BuilderField>
            {calcDraft.kind === "custom" ? (
              <BuilderField label={t("tableCalcExpression")}>
                <input
                  value={calcDraft.expression}
                  onChange={(e) => setCalcDraft((d) => ({ ...d, expression: e.target.value }))}
                  placeholder="spend / conversions"
                  className="ui-input w-full font-mono text-sm"
                />
                <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("tableCalcExpressionHint")}</p>
              </BuilderField>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <BuilderField label={t("tableCalcMetricA")}>
                  <BuilderSelect
                    value={calcDraft.a}
                    onChange={(v) => setCalcDraft((d) => ({ ...d, a: v as MetricKey }))}
                    options={METRIC_CATALOG.map((m) => ({ value: m.key, label: tMetrics(m.label) }))}
                  />
                </BuilderField>
                <BuilderField label={t("tableCalcMetricB")}>
                  <BuilderSelect
                    value={calcDraft.b}
                    onChange={(v) => setCalcDraft((d) => ({ ...d, b: v as MetricKey }))}
                    options={METRIC_CATALOG.map((m) => ({ value: m.key, label: tMetrics(m.label) }))}
                  />
                </BuilderField>
              </div>
            )}
            <BuilderField label={t("tableColumnFormat")}>
              <BuilderSelect
                value={calcDraft.format}
                onChange={(v) => setCalcDraft((d) => ({ ...d, format: v as TableColumnFormat }))}
                options={FORMATS.map((f) => ({ value: f, label: t(`columnFormat_${f}`) }))}
              />
            </BuilderField>
            <div className="flex justify-end gap-2">
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setAddingCalc(false)}>
                {t("configCancel")}
              </button>
              <button type="button" className="ui-btn ui-btn-primary text-xs" onClick={addCalculatedColumn}>
                <Plus size={12} className="mr-1 inline" />
                {t("tableAddColumn")}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-2 space-y-2">
          {columnDefs.map((col, i) => (
            <div
              key={col.id}
              className="rounded-lg border p-2"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center gap-1">
                <GripVertical size={12} className="shrink-0 text-[var(--text-dimmer)]" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-main)]">
                  {columnLabel(col, tMetrics)}
                  {col.kind === "calculated" ? (
                    <span className="ml-1 text-[10px] font-normal text-[#a78bfa]">ƒ</span>
                  ) : null}
                </span>
                <button type="button" disabled={i === 0} onClick={() => moveColumn(i, -1)} className="rounded p-0.5 hover:bg-[var(--surface-bg)] disabled:opacity-30">
                  <ChevronUp size={12} />
                </button>
                <button type="button" disabled={i === columnDefs.length - 1} onClick={() => moveColumn(i, 1)} className="rounded p-0.5 hover:bg-[var(--surface-bg)] disabled:opacity-30">
                  <ChevronDown size={12} />
                </button>
                <button type="button" onClick={() => removeColumn(col.id)} className="rounded px-1 text-[10px] text-[var(--text-dimmer)] hover:text-red-400">
                  ×
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <BuilderField label={t("tableColumnFormat")}>
                  <BuilderSelect
                    value={col.format ?? "auto"}
                    onChange={(v) => updateColumn(col.id, { format: v as TableColumnFormat })}
                    options={FORMATS.map((f) => ({ value: f, label: t(`columnFormat_${f}`) }))}
                  />
                </BuilderField>
                <BuilderField label={t("panelTableTextAlign")}>
                  <BuilderSelect
                    value={col.align ?? "inherit"}
                    onChange={(v) =>
                      updateColumn(col.id, { align: v === "inherit" ? undefined : (v as TableColumnDef["align"]) })
                    }
                    options={[
                      { value: "inherit", label: t("columnAlignInherit") },
                      { value: "left", label: t("alignLeft") },
                      { value: "center", label: t("alignCenter") },
                      { value: "right", label: t("alignRight") }
                    ]}
                  />
                </BuilderField>
              </div>
              {col.kind === "calculated" ? (
                <input
                  value={col.label ?? ""}
                  onChange={(e) => updateColumn(col.id, { label: e.target.value || undefined })}
                  placeholder={t("tableCalcLabelPlaceholder")}
                  className="ui-input mt-2 w-full text-xs"
                />
              ) : null}
            </div>
          ))}
        </div>

        <BuilderMetricPicker
          activeKeys={metricsRequiredForColumns(columnDefs)}
          tMetrics={(key) => tMetrics(key)}
          max={12}
          onToggle={(key) => {
            const exists = columnDefs.some((c) => c.id === key);
            if (exists) {
              removeColumn(key);
            } else {
              addMetricColumn(key);
            }
          }}
        />
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("wizardStep_tableSort")}
        </p>
        <label className="mb-2 flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.sortEnabled !== false}
            onChange={(e) => onPatch({ sortEnabled: e.target.checked })}
          />
          {t("tableSortEnabled")}
        </label>
        {config.sortEnabled !== false ? (
          <>
            <BuilderField label={t("wizardTableSort")}>
              <BuilderSelect
                value={config.sortColumnId ?? config.sortColumn ?? "roas"}
                onChange={(v) => {
                  onPatch({
                    sortColumnId: v,
                    sortColumn: v === "name" ? "name" : (v as MetricKey)
                  });
                }}
                options={sortOptions}
              />
            </BuilderField>
            <div className="mt-2 flex gap-2">
              {(["asc", "desc"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onPatch({ sortDirection: dir })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium",
                    config.sortDirection === dir
                      ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.1)] text-[#a78bfa]"
                      : "border-[var(--border-color)] text-[var(--text-dim)]"
                  )}
                >
                  {dir === "asc" ? t("sortAsc") : t("sortDesc")}
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-main)]">
              <input
                type="checkbox"
                checked={config.userSortable === true}
                onChange={(e) => onPatch({ userSortable: e.target.checked })}
              />
              {t("tableUserSortable")}
            </label>
          </>
        ) : null}
        <BuilderField label={t("wizardTableTopN")}>
          <BuilderSelect
            value={String(config.topN ?? 25)}
            onChange={(v) => onPatch({ topN: Number(v) })}
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" }
            ]}
          />
        </BuilderField>
      </section>
    </div>
  );
}
