"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid, SlidersHorizontal } from "lucide-react";

import { MetricPickerModal } from "@/components/MetricPickerModal";
import {
  DASHBOARD_AVAILABLE_SECTION_KEYS,
  DEFAULT_DASHBOARD_LAYOUT,
  MAX_HERO_METRICS,
  type ChartPanelSize,
  type DashboardLayoutPrefs,
  type DashboardSectionKey
} from "@/lib/dashboard-layout-prefs";
import {
  MAX_CHART_METRICS,
  METRIC_CATALOG,
  METRIC_CATEGORIES,
  type MetricKey
} from "@/lib/dashboard-metrics";

export function DashboardCustomizeModal({
  open,
  layout,
  chartMetrics,
  onApply,
  onClose
}: {
  open: boolean;
  layout: DashboardLayoutPrefs;
  chartMetrics: MetricKey[];
  onApply: (next: { layout: DashboardLayoutPrefs; chartMetrics: MetricKey[] }) => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard");
  const tMetrics = useTranslations("metrics");
  const tCat = useTranslations("metricsCat");
  const [draftLayout, setDraftLayout] = useState(layout);
  const [draftChartMetrics, setDraftChartMetrics] = useState(chartMetrics);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraftLayout(layout);
      setDraftChartMetrics(chartMetrics);
      setHeroQuery("");
    }
  }, [open, layout, chartMetrics]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !chartPickerOpen) onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, chartPickerOpen, onClose]);

  const heroGrouped = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    const out = { performance: [] as typeof METRIC_CATALOG, results: [] as typeof METRIC_CATALOG, costs: [] as typeof METRIC_CATALOG };
    for (const m of METRIC_CATALOG) {
      if (q && !tMetrics(m.label).toLowerCase().includes(q)) continue;
      out[m.category].push(m);
    }
    return out;
  }, [heroQuery, tMetrics]);

  if (!open) return null;

  function toggleSection(key: DashboardSectionKey) {
    setDraftLayout((cur) => ({
      ...cur,
      sections: { ...cur.sections, [key]: !cur.sections[key] }
    }));
  }

  function toggleHeroMetric(key: MetricKey) {
    setDraftLayout((cur) => {
      const selected = cur.heroMetrics;
      const next = selected.includes(key)
        ? selected.filter((k) => k !== key)
        : selected.length >= MAX_HERO_METRICS
          ? selected
          : [...selected, key];
      return { ...cur, heroMetrics: next };
    });
  }

  function moveSection(key: DashboardSectionKey, direction: -1 | 1) {
    setDraftLayout((cur) => {
      const order = [...cur.sectionOrder];
      // Move relativo aos vizinhos visíveis (ignora seções não disponíveis no dash).
      const visible = order.filter((k) => DASHBOARD_AVAILABLE_SECTION_KEYS.includes(k));
      const vIdx = visible.indexOf(key);
      if (vIdx < 0) return cur;
      const targetKey = visible[vIdx + direction];
      if (!targetKey) return cur;
      const a = order.indexOf(key);
      const b = order.indexOf(targetKey);
      [order[a], order[b]] = [order[b], order[a]];
      return { ...cur, sectionOrder: order };
    });
  }

  function setChartSize(size: ChartPanelSize) {
    setDraftLayout((cur) => ({ ...cur, chartSize: size }));
  }

  function resetLayout() {
    setDraftLayout({
      sections: { ...DEFAULT_DASHBOARD_LAYOUT.sections },
      heroMetrics: [],
      sectionOrder: [...DEFAULT_DASHBOARD_LAYOUT.sectionOrder],
      chartSize: DEFAULT_DASHBOARD_LAYOUT.chartSize
    });
    setDraftChartMetrics(chartMetrics);
  }

  const sectionLabel = (key: DashboardSectionKey) => t(`layoutSection_${key}` as "layoutSection_brainShelf");

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onMouseDown={onClose}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--ui-accent-muted)" }}
              >
                <SlidersHorizontal size={16} style={{ color: "var(--ui-accent)" }} />
              </div>
              <div>
                <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                  {t("layoutModalTitle")}
                </h2>
                <p className="text-xs text-[var(--text-dim)]">{t("layoutModalHint")}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section>
              <div className="mb-2 flex items-center gap-2">
                <LayoutGrid size={14} style={{ color: "var(--text-dimmer)" }} />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("layoutSectionsTitle")}
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DASHBOARD_AVAILABLE_SECTION_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-[var(--surface-bg)]"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <input
                      type="checkbox"
                      checked={draftLayout.sections[key]}
                      onChange={() => toggleSection(key)}
                      className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--violet)] focus:ring-violet-500"
                    />
                    <span className="text-sm text-[var(--text-main)]">{sectionLabel(key)}</span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("layoutOrderTitle")}
              </h3>
              <p className="mb-2 text-[11px] text-[var(--text-dim)]">{t("layoutOrderHint")}</p>
              <div className="space-y-1.5">
                {draftLayout.sectionOrder
                  .filter((key) => DASHBOARD_AVAILABLE_SECTION_KEYS.includes(key))
                  .map((key, idx, availableOrder) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <span className="text-sm text-[var(--text-main)]">{sectionLabel(key)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(key, -1)}
                        className="rounded-md border p-1 disabled:opacity-30"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                        aria-label={t("layoutMoveUp")}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === availableOrder.length - 1}
                        onClick={() => moveSection(key, 1)}
                        className="rounded-md border p-1 disabled:opacity-30"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                        aria-label={t("layoutMoveDown")}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("layoutHeroTitle")}
                </h3>
                <span className="text-[11px] text-[var(--text-dim)]">
                  {t("layoutHeroSelected", { count: draftLayout.heroMetrics.length })}
                </span>
              </div>
              <p className="mb-2 text-[11px] text-[var(--text-dim)]">{t("layoutHeroHint")}</p>
              <input
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder={t("metricsSearch")}
                className="mb-3 w-full ui-input"
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border-color)" }}>
                {METRIC_CATEGORIES.map((cat) =>
                  heroGrouped[cat].length ? (
                    <div key={cat} className="mb-2 last:mb-0">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                        {tCat(cat)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {heroGrouped[cat].map((m) => {
                          const checked = draftLayout.heroMetrics.includes(m.key);
                          const disabled = !checked && draftLayout.heroMetrics.length >= MAX_HERO_METRICS;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleHeroMetric(m.key)}
                              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                                disabled ? "cursor-not-allowed opacity-40" : ""
                              }`}
                              style={
                                checked
                                  ? {
                                      background: `${m.color}18`,
                                      border: `1px solid ${m.color}45`,
                                      color: m.color
                                    }
                                  : {
                                      border: "1px solid var(--border-color)",
                                      color: "var(--text-dimmer)"
                                    }
                              }
                            >
                              {tMetrics(m.label)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                    {t("layoutChartTitle")}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("layoutChartHint")}</p>
                </div>
                <button
                  type="button"
                  className="ui-link shrink-0 text-xs font-semibold"
                  onClick={() => setChartPickerOpen(true)}
                >
                  {t("layoutEditChart")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {draftChartMetrics.map((key) => (
                  <span
                    key={key}
                    className="rounded-md px-2 py-1 text-[11px] font-medium"
                    style={{
                      background: `${METRIC_CATALOG.find((m) => m.key === key)?.color ?? "#7c3aed"}18`,
                      color: METRIC_CATALOG.find((m) => m.key === key)?.color ?? "#7c3aed"
                    }}
                  >
                    {tMetrics(key)}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("layoutChartSizeTitle")}
              </h3>
              <p className="mb-2 text-[11px] text-[var(--text-dim)]">{t("layoutChartSizeHint")}</p>
              <div className="flex flex-wrap gap-2">
                {(["compact", "default", "tall"] as ChartPanelSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setChartSize(size)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      draftLayout.chartSize === size
                        ? {
                            borderColor: "var(--ui-accent)",
                            background: "var(--ui-accent-muted)",
                            color: "var(--ui-accent)"
                          }
                        : {
                            borderColor: "var(--border-color)",
                            color: "var(--text-dim)"
                          }
                    }
                  >
                    {t(`layoutChartSize_${size}` as "layoutChartSize_compact")}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-5 py-3">
            <button type="button" className="ui-link text-xs font-semibold" onClick={resetLayout}>
              {t("layoutReset")}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className="ui-btn-secondary" onClick={onClose}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="ui-btn-primary"
                onClick={() =>
                  onApply({
                    layout: draftLayout,
                    chartMetrics: draftChartMetrics
                  })
                }
              >
                {t("apply")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <MetricPickerModal
        open={chartPickerOpen}
        selected={draftChartMetrics}
        onClose={() => setChartPickerOpen(false)}
        onApply={(next) => {
          setDraftChartMetrics(next.slice(0, MAX_CHART_METRICS));
          setChartPickerOpen(false);
        }}
      />
    </>
  );
}
