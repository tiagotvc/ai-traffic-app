"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { MetricKpiCard } from "@/components/dashboard/MetricPrism";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { SparklineChart } from "@/components/dashboard/SparklineChart";
import { useAppCanvasScope } from "@/components/dashboard/canvas/AppCanvasScopeContext";
import { useClientViewOptional } from "@/components/dashboard/canvas/ClientViewContext";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { KpiCardStyle, TableBlockConfig } from "@/lib/dashboard/app-block-config";
import { normalizeChartMetrics } from "@/lib/dashboard/chart-metrics";
import { parseExtendedChartStyle, parseSlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { resolveTablePresentation, DENSITY_CELL, DENSITY_HEADER, RADIUS_CLASS, TEXT_ALIGN } from "@/lib/dashboard/table-style-presets";
import {
  columnAlign,
  columnLabel,
  evaluateColumnValue,
  formatColumnDisplay,
  metricsRequiredForColumns,
  normalizeTableColumnDefs,
  resolveSortColumnId,
  sortRows
} from "@/lib/dashboard/table-column-config";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { toChartData, toMetricPrismProps } from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function AnalyzeBlockWidget({
  data,
  config
}: {
  data: DashboardData;
  config: Record<string, unknown>;
}) {
  const metricKeys = (config.metricKeys as MetricKey[]) ?? ["spend"];
  const primary = metricKeys[0] ?? "spend";
  const displayMode = (config.displayMode as string) ?? "both";
  const comparePrevious = config.comparePreviousPeriod !== false;
  const chartMetrics = normalizeChartMetrics((config.chartMetrics as MetricKey[]) ?? metricKeys);
  const chartStyle = parseExtendedChartStyle(config.chartStyle);
  const barLayout = (config.barLayout as "vertical" | "horizontal") ?? "vertical";
  const visual = parseSlotVisualConfig(config);
  const kpiStyle = (config.kpiStyle as KpiCardStyle) ?? "default";
  const kpiWrapClass =
    kpiStyle === "elevated"
      ? "rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-md"
      : kpiStyle === "compact"
        ? "scale-[0.97] origin-top-left"
        : "";

  const { primaryKPIs } = toMetricPrismProps({
    summary: data.summary ?? {},
    prevSummary: comparePrevious ? data.prevSummary : null,
    series: data.series,
    heroMetrics: [primary],
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    newDeltaLabel: data.deltaNewLabel
  });
  const kpi = primaryKPIs[0];

  const chartBlock =
    displayMode === "chart" || displayMode === "both" ? (
      <DashboardPerformanceChart
        data={toChartData(data.series, data.locale)}
        activeMetrics={chartMetrics}
        formatValue={data.formatMetricValue}
        metricLabels={data.chartMetricLabels}
        isLoading={data.loading}
        subtitle={data.vsLabel}
        variant="canvas"
        chartStyle={chartStyle}
        barLayout={barLayout}
        disableToggle
        visual={visual}
        metricSummary={data.summary ?? undefined}
      />
    ) : null;

  if (displayMode === "values" && kpi) {
    return (
      <div className={cn("h-full min-h-0 w-full", kpiWrapClass)}>
        <MetricKpiCard kpi={kpi} isLoading={data.loading} />
      </div>
    );
  }

  if (displayMode === "chart") {
    return <div className="h-full min-h-0 w-full">{chartBlock}</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {kpi ? (
        <div className={cn("shrink-0", kpiWrapClass)}>
          <MetricKpiCard kpi={kpi} isLoading={data.loading} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{chartBlock}</div>
    </div>
  );
}

export function GoalBlockWidget({
  data,
  config
}: {
  data: DashboardData;
  config: Record<string, unknown>;
}) {
  const t = useTranslations("dashboardWidgets");
  const metricKey = (config.metricKey as MetricKey) ?? "spend";
  const operator = (config.operator as "lte" | "gte") ?? "lte";
  const target = Number(config.targetValue) || 10000;
  const alertAt = Number(config.alertAtPercent) || 80;
  const pulseAtLimit = config.pulseAtLimit !== false;
  const showSparkline = config.showSparkline !== false;
  const color = METRIC_BY_KEY[metricKey]?.color ?? "#7c3aed";

  const current = data.summary?.[metricKey] ?? 0;
  const pct = target > 0 ? (current / target) * 100 : 0;
  const atLimit =
    operator === "lte" ? current >= target : current <= target && current > 0;
  const atWarning = !atLimit && pct >= alertAt;

  const barColor = atLimit ? "#ef4444" : atWarning ? "#f59e0b" : "#10b981";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border p-4",
        atLimit && pulseAtLimit && "animate-pulse-amber"
      )}
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("goalBlockTitle")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
            {data.formatMetricValue(metricKey, current)}
          </p>
        </div>
        <span className="text-xs text-[var(--text-dim)]">
          {operator === "lte" ? "≤" : "≥"} {data.formatMetricValue(metricKey, target)}
        </span>
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-[var(--surface-bg)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>

      <p className="mb-3 text-[11px] text-[var(--text-dim)]">
        {pct.toFixed(0)}% {t("goalBlockOfTarget")} · {data.vsLabel}
      </p>

      {showSparkline ? (
        <div className="mt-auto h-14 min-h-[56px] rounded-lg" style={{ background: "var(--chart-frame-bg)" }}>
          <SparklineChart
            data={data.series.map((p) => p[metricKey] ?? 0)}
            labels={data.series.map((p) => p.day)}
            color={color}
            formatValue={(v) => data.formatMetricValue(metricKey, v)}
            variant="premium"
          />
        </div>
      ) : null}
    </div>
  );
}

type TableRow = {
  id: string;
  slug: string;
  name: string;
  metrics: Partial<Record<MetricKey, number>>;
  computed?: Record<string, number>;
};

export function TableBlockWidget({
  data,
  config
}: {
  data: DashboardData;
  config: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard");
  const tMetrics = useTranslations("metrics");
  const canvasScope = useAppCanvasScope();
  const clientView = useClientViewOptional();
  const tableConfig = config as TableBlockConfig;
  const columnDefs = useMemo(() => normalizeTableColumnDefs(tableConfig), [tableConfig]);
  const fetchMetrics = useMemo(() => metricsRequiredForColumns(columnDefs), [columnDefs]);
  const periodPreset =
    canvasScope.hasFilterBlock && canvasScope.periodPreset
      ? canvasScope.periodPreset
      : (tableConfig.periodPreset ?? "last30");
  const presentation = resolveTablePresentation(tableConfig);
  const {
    tokens,
    density,
    textAlign,
    borderRadius,
    stickyHeader,
    showRowBorders,
    headerStyleClasses,
    rowStriping,
    rowColorOdd,
    rowColorEven,
    hoverRowColor,
    borderColor,
    headerBgColor,
    headerTextColor
  } = presentation;
  const headerStyle = tableConfig.headerStyle ?? "default";
  const showTitle = tableConfig.showTitle !== false;
  const showHeader = tableConfig.showHeader !== false;
  const title = tableConfig.title?.trim() || t("agencyHealthTitle");
  const defaultAlignClass = TEXT_ALIGN[textAlign];
  const sortColumnId = resolveSortColumnId(tableConfig);
  const sortDirection = tableConfig.sortDirection ?? "desc";
  const sortEnabled = tableConfig.sortEnabled !== false;
  const [userSort, setUserSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);

  const activeSortId = userSort?.id ?? sortColumnId;
  const activeSortDir = userSort?.dir ?? sortDirection;

  const [rawRows, setRawRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKey = useMemo(
    () =>
      JSON.stringify({
        fetchMetrics,
        sortColumnId,
        sortDirection,
        topN: tableConfig.topN,
        periodPreset,
        clientFilter: canvasScope.clientFilter,
        accountFilter: canvasScope.accountFilter,
        searchQuery: canvasScope.searchQuery,
        presetFilter: canvasScope.presetFilter,
        entity: tableConfig.entity,
        columnDefs,
        viewToken: clientView?.viewToken ?? null
      }),
    [
      fetchMetrics,
      sortColumnId,
      sortDirection,
      tableConfig,
      periodPreset,
      canvasScope.clientFilter,
      canvasScope.accountFilter,
      canvasScope.searchQuery,
      canvasScope.presetFilter,
      tableConfig.entity,
      columnDefs,
      clientView?.viewToken
    ]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("entity", tableConfig.entity ?? "clients");
    params.set("period", periodPreset);
    if (canvasScope.clientFilter) params.set("clientId", canvasScope.clientFilter);
    if (canvasScope.accountFilter) params.set("accountId", canvasScope.accountFilter);
    if (canvasScope.searchQuery) params.set("search", canvasScope.searchQuery);
    if (canvasScope.presetFilter) params.set("preset", canvasScope.presetFilter);
    if (clientView?.viewToken) params.set("viewToken", clientView.viewToken);
    params.set(
      "config",
      encodeURIComponent(
        JSON.stringify({
          columns: fetchMetrics,
          columnDefs,
          sortColumn: tableConfig.sortColumn ?? "roas",
          sortColumnId,
          sortDirection: tableConfig.sortDirection ?? "desc",
          sortEnabled,
          topN: tableConfig.topN ?? 25
        })
      )
    );

    void (async () => {
      try {
        const res = await fetch(`/api/dashboard/table-data?${params.toString()}`);
        const json = (await res.json()) as {
          ok?: boolean;
          rows?: TableRow[];
        };
        if (cancelled) return;
        const raw = json.ok && json.rows ? json.rows : [];
        const enriched = raw.map((row) => {
          const computed: Record<string, number> = {};
          for (const col of columnDefs) {
            if (col.kind === "calculated") {
              const val = evaluateColumnValue(col, row.metrics ?? {});
              if (val !== null) computed[col.id] = val;
            }
          }
          return { ...row, computed };
        });
        setRawRows(enriched);
      } catch {
        if (!cancelled) setRawRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, fetchMetrics, periodPreset, canvasScope.clientFilter, tableConfig, clientView?.viewToken, columnDefs, sortColumnId, sortEnabled]);

  const rows = useMemo(() => {
    if (!sortEnabled) return rawRows;
    return sortRows(rawRows, columnDefs, activeSortId, activeSortDir);
  }, [rawRows, columnDefs, activeSortId, activeSortDir, sortEnabled]);

  const getRowBackground = (index: number) => {
    if (rowStriping === "off") return undefined;
    if (rowStriping === "custom") {
      return index % 2 === 0 ? rowColorOdd : rowColorEven;
    }
    return index % 2 === 0 ? rowColorOdd : rowColorEven;
  };

  const handleHeaderSort = (colId: string) => {
    if (!tableConfig.userSortable) return;
    setUserSort((prev) => {
      if (prev?.id === colId) {
        return { id: colId, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { id: colId, dir: "desc" };
    });
  };

  if (loading) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-lg" />;
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        RADIUS_CLASS[borderRadius],
        tokens.wrapper
      )}
      style={borderColor ? { borderColor } : undefined}
    >
      {showTitle ? (
        <div className={cn("shrink-0", tokens.titleBar ?? "border-b px-3 py-2")} style={{ borderColor: borderColor ?? "var(--border-color)" }}>
          <h4 className="text-sm font-semibold text-[var(--text-main)]">{title}</h4>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full text-sm">
          {showHeader ? (
            <thead
              className={cn(stickyHeader && "sticky top-0 z-[1]", headerStyleClasses.thead)}
              style={{
                background:
                  headerBgColor ??
                  (headerStyle === "default" ? "var(--surface-thead)" : undefined),
                color: headerTextColor
              }}
            >
              <tr className={tokens.headerRow}>
                <th
                  className={cn(
                    DENSITY_HEADER[density],
                    headerStyleClasses.headerCell,
                    defaultAlignClass,
                    "font-semibold uppercase tracking-wide",
                    tableConfig.userSortable && "cursor-pointer select-none"
                  )}
                  onClick={() => handleHeaderSort("name")}
                >
                  {t("agencyHealthColClient")}
                  {activeSortId === "name" ? (activeSortDir === "asc" ? " ↑" : " ↓") : null}
                </th>
                {columnDefs.map((col) => {
                  const align = TEXT_ALIGN[columnAlign(col, textAlign)];
                  return (
                    <th
                      key={col.id}
                      className={cn(
                        DENSITY_HEADER[density],
                        headerStyleClasses.headerCell,
                        align,
                        "font-semibold uppercase tracking-wide",
                        tableConfig.userSortable && "cursor-pointer select-none"
                      )}
                      style={headerTextColor ? { color: headerTextColor } : undefined}
                      onClick={() => handleHeaderSort(col.id)}
                    >
                      {columnLabel(col, tMetrics)}
                      {activeSortId === col.id ? (activeSortDir === "asc" ? " ↑" : " ↓") : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((client, rowIndex) => (
              <tr
                key={client.id}
                className={cn(
                  showRowBorders ? tokens.bodyRow : "transition-colors",
                  hoverRowColor && "hover:opacity-95"
                )}
                style={{
                  background: getRowBackground(rowIndex)
                }}
                onMouseEnter={(e) => {
                  if (hoverRowColor) e.currentTarget.style.background = hoverRowColor;
                }}
                onMouseLeave={(e) => {
                  if (hoverRowColor) e.currentTarget.style.background = getRowBackground(rowIndex) ?? "";
                }}
              >
                <td className={cn(DENSITY_CELL[density], defaultAlignClass, "truncate font-medium")}>
                  {clientView?.readOnly ? (
                    <span className="text-[var(--text-main)]">{client.name}</span>
                  ) : (
                    <Link
                      href={`/clients/${client.slug}`}
                      className="text-[var(--text-main)] hover:underline"
                    >
                      {client.name}
                    </Link>
                  )}
                </td>
                {columnDefs.map((col) => {
                  const align = TEXT_ALIGN[columnAlign(col, textAlign)];
                  const value =
                    col.kind === "calculated"
                      ? (client.computed?.[col.id] ?? evaluateColumnValue(col, client.metrics ?? {}))
                      : evaluateColumnValue(col, client.metrics ?? {});
                  return (
                    <td key={col.id} className={cn(DENSITY_CELL[density], align, "truncate")}>
                      {formatColumnDisplay(col, value, (key, v) => data.formatMetricValue(key, v))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
