"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Columns3, Plus, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildMetricCatalogTree,
  catalogNodeToColumnRef,
  columnRefToCatalogId,
  filterCatalogTree,
  type MetricCatalogNode
} from "@/lib/meta-metrics-catalog";
import {
  columnRefKey,
  MAX_TABLE_COLUMNS,
  normalizeTableColumnRefs,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import type { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";

type LayoutHook = ReturnType<typeof useCampaignTableLayout>;

const uxInputClass =
  "w-full rounded-lg border px-3 py-2 text-sm font-body outline-none transition-colors";
const uxInputStyle = {
  color: "var(--text-main)",
  background: "var(--surface-bg)",
  borderColor: "var(--border-color)"
} as const;

function UxInput({
  className = "",
  style,
  onFocus,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${uxInputClass} ${className}`}
      style={{ ...uxInputStyle, ...style }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--amber-bright, #f5a623)";
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        onBlur?.(e);
      }}
    />
  );
}

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
              className="flex w-full items-center gap-1.5 rounded-lg py-1.5 text-left text-xs font-heading font-semibold transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
              onClick={() => setExpanded((e) => ({ ...e, [node.id]: !open }))}
            >
              <span style={{ color: "var(--amber-bright, #f5a623)" }}>{open ? "▼" : "▶"}</span>
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
          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-body transition-colors ${
            disabled ? "cursor-not-allowed opacity-40" : ""
          }`}
          style={{ color: "var(--text-main)" }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => toggleNode(node)}
            className="h-4 w-4 shrink-0 rounded border"
            style={{ accentColor: "var(--amber-bright, #f5a623)" }}
          />
          <span>{node.metricKey ? tMetrics(METRIC_BY_KEY[node.metricKey].label) : node.label}</span>
        </label>
      );
    });
  }

  return (
    <div>
      <UxInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchMetrics")}
        className="mb-3"
      />
      <p className="mb-3 text-xs font-body" style={{ color: "var(--text-dim)" }}>
        {t("selectedCount", { count: selected.length, max })}
      </p>
      <div
        className="max-h-64 overflow-y-auto rounded-xl p-2"
        style={{
          background: "var(--surface-bg)",
          border: "1px solid var(--border-color)",
          scrollbarWidth: "thin"
        }}
      >
        {renderNodes(filtered)}
      </div>
    </div>
  );
}

function LayoutSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<{ id: string; name: string }>;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative min-w-[180px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200"
        style={{
          color: "var(--text-main)",
          background: "var(--filter-btn-bg)",
          borderColor: open ? "var(--amber-bright, #f5a623)" : "var(--border-color)"
        }}
        aria-expanded={open}
      >
        <Settings size={14} style={{ color: "var(--text-dim)" }} />
        <span className="truncate font-body text-sm">{selected?.name ?? options[0]?.name ?? "—"}</span>
        <ChevronDown
          size={14}
          className={`ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border py-1 shadow-2xl"
          style={{
            background: "var(--dropdown-bg, var(--surface-card))",
            borderColor: "var(--border-color)"
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm font-body transition-colors"
              style={{
                color: opt.id === value ? "var(--amber-bright, #f5a623)" : "var(--text-main)",
                background: opt.id === value ? "var(--row-hover, var(--surface-bg))" : "transparent"
              }}
              onMouseEnter={(e) => {
                if (opt.id !== value) e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
              }}
              onMouseLeave={(e) => {
                if (opt.id !== value) e.currentTarget.style.background = "transparent";
              }}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      ) : null}
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
    <UxModalPortal open={open} onClose={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div
            className="absolute left-0 right-0 top-0 h-[3px] rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, #f5a623, #f59e0b88)" }}
          />
          <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(245,166,35,0.12)",
                  border: "1px solid rgba(245,166,35,0.25)"
                }}
              >
                <Columns3 size={18} style={{ color: "#f5a623" }} />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold leading-tight" style={{ color: "var(--text-main)" }}>
                  {t("columnsTitle")}
                </h2>
                <p className="mt-1 text-sm font-body" style={{ color: "var(--text-dim)" }}>
                  {t("columnsHint")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f5a623";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <X size={14} style={{ color: "var(--text-dim)" }} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
            <LayoutSelect
              value={layout.activeLayoutId}
              options={layout.layouts.map((l) => ({ id: l.id, name: l.name }))}
              onChange={(id) => void layout.setActiveLayout(id)}
            />
            <button
              type="button"
              onClick={() => setShowSaveAs((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-body transition-colors"
              style={{
                color: "var(--text-dim)",
                background: "var(--surface-bg)",
                borderColor: showSaveAs ? "var(--amber-bright, #f5a623)" : "var(--border-color)"
              }}
            >
              <Plus size={14} />
              {t("saveView")}
            </button>
          </div>

          {showSaveAs ? (
            <div className="flex gap-2 px-6 pb-4">
              <UxInput
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t("viewNamePrompt")}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => void saveAs()}
                className="rounded-lg px-4 py-2 text-sm font-heading font-semibold"
                style={{ background: "#f5a623", color: "#111" }}
              >
                {t("save")}
              </button>
            </div>
          ) : null}

          <div className="px-6 pb-4">
            <div
              className="inline-flex gap-1 rounded-xl p-1"
              style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
            >
              {(["columns", "formula"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="rounded-lg px-4 py-2 text-sm font-body font-medium transition-all"
                  style={{
                    color: tab === key ? "var(--text-main)" : "var(--text-dim)",
                    background: tab === key ? "var(--surface-card)" : "transparent",
                    border: tab === key ? "1px solid var(--amber-bright, #f5a623)" : "1px solid transparent",
                    boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
                  }}
                >
                  {key === "columns" ? t("tabColumns") : t("tabFormula")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "thin" }}>
          {tab === "columns" ? (
            <MetricCatalogPicker
              selected={metricCols}
              onChange={(metrics) => setDraftCols([...fieldCols, ...metrics])}
              customMetrics={layout.customMetrics}
            />
          ) : (
            <div className="space-y-4">
              <UxInput
                value={formulaName}
                onChange={(e) => setFormulaName(e.target.value)}
                placeholder={t("formulaName")}
              />
              <UxInput
                value={formulaExpr}
                onChange={(e) => setFormulaExpr(e.target.value)}
                placeholder={t("formulaPlaceholder")}
                className="font-mono"
              />
              <label
                className="flex cursor-pointer items-center gap-2.5 text-sm font-body"
                style={{ color: "var(--text-dim)" }}
              >
                <input
                  type="checkbox"
                  checked={formulaShared}
                  onChange={(e) => setFormulaShared(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "var(--amber-bright, #f5a623)" }}
                />
                {t("formulaShared")}
              </label>
              {formulaError ? (
                <p className="text-sm font-body text-red-500">{formulaError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void createFormula()}
                className="rounded-lg px-4 py-2 text-sm font-heading font-semibold"
                style={{ background: "#7c3aed", color: "#fff" }}
              >
                {t("createFormula")}
              </button>
            </div>
          )}
        </div>

        <div
          className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <button
            type="button"
            onClick={() => void layout.resetToDefault()}
            className="text-sm font-body transition-colors"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            {t("resetDefault")}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-5 py-2 text-sm font-body font-medium transition-colors"
              style={{
                borderColor: "var(--border-color)",
                color: "var(--text-dim)",
                background: "var(--surface-card)"
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              className="rounded-lg px-5 py-2 text-sm font-heading font-semibold"
              style={{ background: "#f5a623", color: "#111" }}
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    </UxModalPortal>
  );
}
