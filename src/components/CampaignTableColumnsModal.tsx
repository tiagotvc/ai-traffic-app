"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  buildMetricCatalogTree,
  catalogNodeToColumnRef,
  columnRefToCatalogId,
  filterCatalogTree,
  flattenCatalog,
  type MetricCatalogNode
} from "@/lib/meta-metrics-catalog";
import {
  columnRefKey,
  MAX_TABLE_COLUMNS,
  normalizeTableColumnRefs,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import type { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

type LayoutHook = ReturnType<typeof useCampaignTableLayout>;

export function MetricCatalogPicker({
  selected,
  onChange,
  customMetrics,
  max = MAX_TABLE_COLUMNS
}: {
  selected: TableColumnRef[];
  onChange: (cols: TableColumnRef[]) => void;
  customMetrics: Array<{ id: string; name: string }>;
  max?: number;
}) {
  const t = useTranslations("campaignTableLayout");
  const tMetrics = useTranslations("metrics");
  const tCat = useTranslations("campaignTableLayout");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    meta_fields: true,
    derived: true,
    results_metrics: true,
    results_actions: false,
    custom: true
  });

  const tree = useMemo(
    () => buildMetricCatalogTree(customMetrics),
    [customMetrics]
  );
  const filtered = useMemo(() => filterCatalogTree(tree, query), [tree, query]);
  const selectedIds = useMemo(() => new Set(selected.map(columnRefToCatalogId)), [selected]);

  function toggleNode(node: MetricCatalogNode) {
    const ref = catalogNodeToColumnRef(node);
    if (!ref) return;
    const id = columnRefToCatalogId(ref);
    if (selectedIds.has(id)) {
      onChange(selected.filter((c) => columnRefToCatalogId(c) !== id));
    } else if (selected.length < max) {
      onChange([...selected, ref]);
    }
  }

  function nodeLabel(node: MetricCatalogNode): string {
    if (node.metricKey && node.metricKey in METRIC_BY_KEY) {
      return tMetrics(METRIC_BY_KEY[node.metricKey].label);
    }
    if (node.category === "meta_fields") return tCat("catMetaFields");
    if (node.category === "derived") return tCat("catDerived");
    if (node.id === "results_metrics") return tCat("catResults");
    if (node.id === "results_actions") return tCat("catActions");
    if (node.id === "custom") return tCat("catCustom");
    return node.label;
  }

  function renderNodes(nodes: MetricCatalogNode[], depth = 0) {
    return nodes.map((node) => {
      if (node.children?.length) {
        const open = expanded[node.id] ?? false;
        return (
          <div key={node.id} className={depth ? "ml-3" : ""}>
            <button
              type="button"
              className="flex w-full items-center gap-1 py-1 text-left text-xs font-semibold text-slate-600"
              onClick={() => setExpanded((e) => ({ ...e, [node.id]: !open }))}
            >
              <span>{open ? "▼" : "▶"}</span>
              {nodeLabel(node)}
            </button>
            {open ? <div className="mb-2">{renderNodes(node.children, depth + 1)}</div> : null}
          </div>
        );
      }
      const ref = catalogNodeToColumnRef(node);
      if (!ref) return null;
      const id = columnRefToCatalogId(ref);
      const checked = selectedIds.has(id);
      const disabled = !checked && selected.length >= max;
      return (
        <label
          key={node.id}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs ${
            disabled ? "cursor-not-allowed opacity-40" : "hover:bg-slate-50"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => toggleNode(node)}
            className="accent-violet-600"
          />
          <span>{node.metricKey ? tMetrics(METRIC_BY_KEY[node.metricKey].label) : node.label}</span>
        </label>
      );
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchMetrics")}
        className="ui-input mb-2 text-xs"
      />
      <p className="mb-2 text-[11px] text-slate-500">
        {t("selectedCount", { count: selected.length, max })}
      </p>
      <div className="max-h-64 overflow-y-auto">{renderNodes(filtered)}</div>
    </div>
  );
}

export function CampaignTableColumnsModal({
  open,
  onClose,
  layout
}: {
  open: boolean;
  onClose: () => void;
  layout: LayoutHook;
}) {
  const t = useTranslations("campaignTableLayout");
  const [draftCols, setDraftCols] = useState<TableColumnRef[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [formulaName, setFormulaName] = useState("");
  const [formulaExpr, setFormulaExpr] = useState("");
  const [formulaShared, setFormulaShared] = useState(false);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [tab, setTab] = useState<"columns" | "formula">("columns");

  useEffect(() => {
    if (open) {
      setDraftCols([...layout.columns]);
      setSaveName("");
      setShowSaveAs(false);
      setTab("columns");
    }
  }, [open, layout.columns]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const metricCols = draftCols.filter((c) => c.kind !== "field");
  const fieldCols = draftCols.filter((c) => c.kind === "field");

  async function apply() {
    await layout.applyLayout(draftCols);
    onClose();
  }

  async function saveAs() {
    if (!saveName.trim()) return;
    await layout.saveAsNewLayout(saveName.trim(), draftCols);
    setShowSaveAs(false);
    onClose();
  }

  async function createFormula() {
    setFormulaError(null);
    const res = await fetch("/api/custom-metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formulaName,
        formula: formulaExpr,
        format: "number",
        shared: formulaShared
      })
    });
    const j = await res.json();
    if (!j.ok) {
      setFormulaError(j.error ?? t("formulaError"));
      return;
    }
    await layout.reload();
    setFormulaName("");
    setFormulaExpr("");
    setTab("columns");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{t("columnsTitle")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("columnsHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="ui-select text-xs"
              value={layout.activeLayoutId}
              onChange={(e) => void layout.setActiveLayout(e.target.value)}
            >
              {layout.layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button type="button" className="ui-btn-secondary text-xs" onClick={() => setShowSaveAs(true)}>
              {t("saveView")}
            </button>
          </div>
          {showSaveAs ? (
            <div className="mt-2 flex gap-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t("viewNamePrompt")}
                className="ui-input flex-1 text-xs"
              />
              <button type="button" className="ui-btn-primary text-xs" onClick={() => void saveAs()}>
                {t("save")}
              </button>
            </div>
          ) : null}
          <div className="mt-3 flex gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              className={`text-xs font-medium ${tab === "columns" ? "text-violet-700" : "text-slate-500"}`}
              onClick={() => setTab("columns")}
            >
              {t("tabColumns")}
            </button>
            <button
              type="button"
              className={`text-xs font-medium ${tab === "formula" ? "text-violet-700" : "text-slate-500"}`}
              onClick={() => setTab("formula")}
            >
              {t("tabFormula")}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tab === "columns" ? (
            <MetricCatalogPicker
              selected={metricCols}
              onChange={(metrics) => setDraftCols([...fieldCols, ...metrics])}
              customMetrics={layout.customMetrics}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <input
                value={formulaName}
                onChange={(e) => setFormulaName(e.target.value)}
                placeholder={t("formulaName")}
                className="ui-input w-full text-xs"
              />
              <input
                value={formulaExpr}
                onChange={(e) => setFormulaExpr(e.target.value)}
                placeholder={t("formulaPlaceholder")}
                className="ui-input w-full font-mono text-xs"
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={formulaShared}
                  onChange={(e) => setFormulaShared(e.target.checked)}
                  className="accent-violet-600"
                />
                {t("formulaShared")}
              </label>
              {formulaError ? <p className="text-xs text-red-600">{formulaError}</p> : null}
              <button type="button" className="ui-btn-primary text-xs" onClick={() => void createFormula()}>
                {t("createFormula")}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" className="ui-btn-secondary text-xs" onClick={() => void layout.resetToDefault()}>
            {t("resetDefault")}
          </button>
          <button type="button" className="ui-btn-secondary text-xs" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="button" className="ui-btn-primary text-xs" onClick={() => void apply()}>
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
