"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid, SlidersHorizontal } from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import {
  DASHBOARD_AVAILABLE_SECTION_KEYS,
  DEFAULT_DASHBOARD_LAYOUT,
  MAX_HERO_METRICS,
  MAX_PERIOD_METRICS,
  type ChartPanelSize,
  type DashboardLayoutPrefs,
  type DashboardSectionKey
} from "@/lib/dashboard-layout-prefs";
import {
  getRowIdForSection,
  isRowLayoutControlAnchor,
  type DashboardSectionRowId,
  type DashboardSectionRowLayout
} from "@/lib/dashboard-section-rows";
import {
  MAX_CHART_METRICS,
  METRIC_CATALOG,
  METRIC_CATEGORIES,
  type MetricKey
} from "@/lib/dashboard-metrics";

const CHART_METRIC_OPTIONS = METRIC_CATALOG.filter((m) =>
  (["spend", "roas", "clicks", "impressions", "conversions", "ctr"] as MetricKey[]).includes(m.key)
);

const CONFIGURABLE_SECTIONS = new Set<DashboardSectionKey>([
  "heroKpis",
  "secondaryMetrics",
  "chart"
]);

function MetricCheckboxPicker({
  selected,
  maxCount,
  query,
  onQueryChange,
  onToggle,
  searchPlaceholder,
  catalog = METRIC_CATALOG
}: {
  selected: MetricKey[];
  maxCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (key: MetricKey) => void;
  searchPlaceholder: string;
  catalog?: typeof METRIC_CATALOG;
}) {
  const tMetrics = useTranslations("metrics");
  const tCat = useTranslations("metricsCat");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = {
      performance: [] as typeof METRIC_CATALOG,
      results: [] as typeof METRIC_CATALOG,
      costs: [] as typeof METRIC_CATALOG
    };
    for (const m of catalog) {
      if (q && !tMetrics(m.label).toLowerCase().includes(q)) continue;
      out[m.category].push(m);
    }
    return out;
  }, [query, tMetrics, catalog]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="mb-3 w-full ui-input"
      />
      <div
        className="max-h-44 overflow-y-auto rounded-xl border p-2"
        style={{ borderColor: "var(--creator-card-border, var(--border-color))" }}
      >
        {METRIC_CATEGORIES.map((cat) =>
          grouped[cat].length ? (
            <div key={cat} className="mb-2 last:mb-0">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {tCat(cat)}
              </div>
              <div className="space-y-1">
                {grouped[cat].map((m) => {
                  const checked = selected.includes(m.key);
                  const disabled = !checked && selected.length >= maxCount;
                  return (
                    <label
                      key={m.key}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
                      }`}
                      style={{
                        borderColor: checked ? `${m.color}45` : "var(--creator-card-border, var(--border-color))",
                        background: checked ? `${m.color}10` : undefined
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggle(m.key)}
                        className="h-3.5 w-3.5 rounded border-[var(--border-color)] text-[var(--ui-accent)] focus:ring-violet-500"
                      />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: checked ? m.color : "var(--text-dim)" }}
                      >
                        {tMetrics(m.label)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function SectionSettingsPanel({
  sectionId,
  draftLayout,
  draftChartMetrics,
  heroQuery,
  periodQuery,
  chartQuery,
  onHeroQueryChange,
  onPeriodQueryChange,
  onChartQueryChange,
  onToggleHeroMetric,
  onTogglePeriodMetric,
  onToggleChartMetric,
  onSetChartSize,
  sectionLabel
}: {
  sectionId: DashboardSectionKey;
  draftLayout: DashboardLayoutPrefs;
  draftChartMetrics: MetricKey[];
  heroQuery: string;
  periodQuery: string;
  chartQuery: string;
  onHeroQueryChange: (value: string) => void;
  onPeriodQueryChange: (value: string) => void;
  onChartQueryChange: (value: string) => void;
  onToggleHeroMetric: (key: MetricKey) => void;
  onTogglePeriodMetric: (key: MetricKey) => void;
  onToggleChartMetric: (key: MetricKey) => void;
  onSetChartSize: (size: ChartPanelSize) => void;
  sectionLabel: (key: DashboardSectionKey) => string;
}) {
  const t = useTranslations("dashboard");

  if (sectionId === "heroKpis") {
    return (
      <div className="space-y-2 px-1 py-2">
        <p className="text-xs font-semibold text-[var(--text-main)]">{sectionLabel(sectionId)}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-[var(--text-main)]">{t("layoutHeroTitle")}</p>
          <span className="text-[10px] text-[var(--text-dim)]">
            {t("layoutHeroSelected", { count: draftLayout.heroMetrics.length })}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-dim)]">{t("layoutHeroHint")}</p>
        <MetricCheckboxPicker
          selected={draftLayout.heroMetrics}
          maxCount={MAX_HERO_METRICS}
          query={heroQuery}
          onQueryChange={onHeroQueryChange}
          onToggle={onToggleHeroMetric}
          searchPlaceholder={t("metricsSearch")}
        />
      </div>
    );
  }

  if (sectionId === "secondaryMetrics") {
    return (
      <div className="space-y-2 px-1 py-2">
        <p className="text-xs font-semibold text-[var(--text-main)]">{sectionLabel(sectionId)}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-[var(--text-main)]">{t("layoutPeriodTitle")}</p>
          <span className="text-[10px] text-[var(--text-dim)]">
            {t("layoutPeriodSelected", { count: draftLayout.periodMetrics.length })}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-dim)]">{t("layoutPeriodHint")}</p>
        <MetricCheckboxPicker
          selected={draftLayout.periodMetrics}
          maxCount={MAX_PERIOD_METRICS}
          query={periodQuery}
          onQueryChange={onPeriodQueryChange}
          onToggle={onTogglePeriodMetric}
          searchPlaceholder={t("metricsSearch")}
        />
      </div>
    );
  }

  if (sectionId === "chart") {
    return (
      <div className="space-y-3 px-1 py-2">
        <p className="text-xs font-semibold text-[var(--text-main)]">{sectionLabel(sectionId)}</p>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--text-main)]">{t("layoutChartTitle")}</p>
            <span className="text-[10px] text-[var(--text-dim)]">
              {t("metricsSelected", { count: draftChartMetrics.length })}
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-dim)]">{t("layoutChartHint")}</p>
        </div>
        <MetricCheckboxPicker
          selected={draftChartMetrics}
          maxCount={MAX_CHART_METRICS}
          query={chartQuery}
          onQueryChange={onChartQueryChange}
          onToggle={onToggleChartMetric}
          searchPlaceholder={t("metricsSearch")}
          catalog={CHART_METRIC_OPTIONS}
        />
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-[var(--text-main)]">{t("layoutChartSizeTitle")}</p>
          <p className="mb-2 text-[10px] text-[var(--text-dim)]">{t("layoutChartSizeHint")}</p>
          <div className="flex flex-wrap gap-2">
            {(["compact", "default", "tall"] as ChartPanelSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSetChartSize(size)}
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
        </div>
      </div>
    );
  }

  return null;
}

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
  const [draftLayout, setDraftLayout] = useState(layout);
  const [draftChartMetrics, setDraftChartMetrics] = useState(chartMetrics);
  const [expandedSectionId, setExpandedSectionId] = useState<DashboardSectionKey | null>(null);
  const [heroQuery, setHeroQuery] = useState("");
  const [periodQuery, setPeriodQuery] = useState("");
  const [chartQuery, setChartQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraftLayout(layout);
      setDraftChartMetrics(chartMetrics);
      setExpandedSectionId(null);
      setHeroQuery("");
      setPeriodQuery("");
      setChartQuery("");
    }
  }, [open, layout, chartMetrics]);

  const orderedSections = useMemo(
    () =>
      draftLayout.sectionOrder.filter((key) => DASHBOARD_AVAILABLE_SECTION_KEYS.includes(key)),
    [draftLayout.sectionOrder]
  );

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

  function togglePeriodMetric(key: MetricKey) {
    setDraftLayout((cur) => {
      const selected = cur.periodMetrics;
      const next = selected.includes(key)
        ? selected.filter((k) => k !== key)
        : selected.length >= MAX_PERIOD_METRICS
          ? selected
          : [...selected, key];
      return { ...cur, periodMetrics: next };
    });
  }

  function toggleChartMetric(key: MetricKey) {
    setDraftChartMetrics((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      if (cur.length >= MAX_CHART_METRICS) return cur;
      return [...cur, key];
    });
  }

  function moveSection(key: DashboardSectionKey, direction: -1 | 1) {
    setDraftLayout((cur) => {
      const order = [...cur.sectionOrder];
      const available = order.filter((k) => DASHBOARD_AVAILABLE_SECTION_KEYS.includes(k));
      const idx = available.indexOf(key);
      if (idx < 0) return cur;
      const targetKey = available[idx + direction];
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
      periodMetrics: [],
      sectionOrder: [...DEFAULT_DASHBOARD_LAYOUT.sectionOrder],
      chartSize: DEFAULT_DASHBOARD_LAYOUT.chartSize,
      sectionRowLayouts: { ...DEFAULT_DASHBOARD_LAYOUT.sectionRowLayouts }
    });
    setDraftChartMetrics(chartMetrics);
    setExpandedSectionId(null);
  }

  function setSectionRowLayout(rowId: DashboardSectionRowId, layout: DashboardSectionRowLayout) {
    setDraftLayout((cur) => ({
      ...cur,
      sectionRowLayouts: { ...cur.sectionRowLayouts, [rowId]: layout }
    }));
  }

  function toggleConfigure(key: DashboardSectionKey) {
    setExpandedSectionId((cur) => (cur === key ? null : key));
  }

  const sectionLabel = (key: DashboardSectionKey) => t(`layoutSection_${key}` as "layoutSection_brainShelf");

  const showSettingsPanel =
    expandedSectionId !== null && CONFIGURABLE_SECTIONS.has(expandedSectionId);

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("layoutModalTitle")}
      subtitle={t("layoutModalHint")}
      titleIcon={<SlidersHorizontal size={16} className="text-[var(--ui-accent)]" />}
      width="lg"
      contentClassName="flex min-h-0 flex-col overflow-hidden"
      onCancel={onClose}
      cancelLabel={t("cancel")}
      onPrimary={() =>
        onApply({
          layout: draftLayout,
          chartMetrics: draftChartMetrics
        })
      }
      primaryLabel={t("apply")}
      onClear={resetLayout}
      clearDisabled={false}
    >
      <section className="campaign-creator-card campaign-creator-card--compact flex min-h-[min(520px,58vh)] flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <LayoutGrid size={14} className="text-[var(--text-dimmer)]" />
          <h3 className="campaign-creator-orion-section-label">{t("layoutSectionsTitle")}</h3>
        </div>
        <p className="mb-3 shrink-0 text-[11px] text-[var(--text-dim)]">{t("layoutSectionsUnifiedHint")}</p>

        <div
          className={`grid min-h-0 flex-1 gap-2 ${showSettingsPanel ? "grid-rows-2" : "grid-rows-1"}`}
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="space-y-1.5 pr-0.5">
              {orderedSections.map((key, idx) => {
                const enabled = draftLayout.sections[key];
                const hasConfig = CONFIGURABLE_SECTIONS.has(key);
                const isActive = expandedSectionId === key;
                const rowId = getRowIdForSection(key);
                const showRowLayout = rowId && isRowLayoutControlAnchor(key, orderedSections);

                return (
                  <div
                    key={key}
                    className="rounded-xl border transition-colors"
                    style={{
                      borderColor: isActive
                        ? "var(--ui-accent)"
                        : "var(--creator-card-border, var(--border-color))",
                      opacity: enabled ? 1 : 0.72
                    }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleSection(key)}
                        className="h-4 w-4 shrink-0 rounded border-[var(--border-color)] text-[var(--ui-accent)] focus:ring-violet-500"
                        aria-label={sectionLabel(key)}
                      />
                      <span
                        className={`min-w-0 flex-1 text-sm ${enabled ? "text-[var(--text-main)]" : "text-[var(--text-dim)]"}`}
                      >
                        {sectionLabel(key)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {hasConfig ? (
                          <button
                            type="button"
                            onClick={() => toggleConfigure(key)}
                            className="rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
                            style={{
                              borderColor: isActive ? "var(--ui-accent)" : "var(--border-color)",
                              color: isActive ? "var(--ui-accent)" : "var(--text-dim)",
                              background: isActive ? "var(--ui-accent-muted)" : undefined
                            }}
                            aria-expanded={isActive}
                          >
                            {t("layoutConfigure")}
                          </button>
                        ) : null}
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
                          disabled={idx === orderedSections.length - 1}
                          onClick={() => moveSection(key, 1)}
                          className="rounded-md border p-1 disabled:opacity-30"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                          aria-label={t("layoutMoveDown")}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                    {showRowLayout && rowId ? (
                      <div className="border-t px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                        <p className="mb-1.5 text-[10px] font-medium text-[var(--text-dim)]">
                          {t("layoutRowTitle")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(["sideBySide", "stacked"] as DashboardSectionRowLayout[]).map((layout) => (
                            <button
                              key={layout}
                              type="button"
                              onClick={() => setSectionRowLayout(rowId, layout)}
                              className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-colors"
                              style={
                                draftLayout.sectionRowLayouts[rowId] === layout
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
                              {t(`layoutRow_${layout}` as "layoutRow_sideBySide")}
                            </button>
                          ))}
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("layoutRowHint")}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {showSettingsPanel && expandedSectionId ? (
            <div
              className="min-h-0 overflow-y-auto overscroll-contain rounded-xl border px-3 py-1"
              style={{
                borderColor: "var(--creator-card-border, var(--border-color))",
                background: "var(--creator-card-bg-inset, var(--surface-bg))"
              }}
            >
              <SectionSettingsPanel
                sectionId={expandedSectionId}
                draftLayout={draftLayout}
                draftChartMetrics={draftChartMetrics}
                heroQuery={heroQuery}
                periodQuery={periodQuery}
                chartQuery={chartQuery}
                onHeroQueryChange={setHeroQuery}
                onPeriodQueryChange={setPeriodQuery}
                onChartQueryChange={setChartQuery}
                onToggleHeroMetric={toggleHeroMetric}
                onTogglePeriodMetric={togglePeriodMetric}
                onToggleChartMetric={toggleChartMetric}
                onSetChartSize={setChartSize}
                sectionLabel={sectionLabel}
              />
            </div>
          ) : null}
        </div>
      </section>
    </CreatorModalShell>
  );
}
