"use client";

import { useLocale, useTranslations } from "next-intl";

import { COLUMN_I18N_KEYS } from "@/lib/campaign-table-columns";
import {
  columnRefKey,
  resolveColumnNumericValue,
  type MetricRowData,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { formatMetricValue, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { evaluateFormula } from "@/lib/metric-formula";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";

export function CampaignTableHead({
  columns,
  customMetricNames,
  sortKey,
  sortDir,
  onSort
}: {
  columns: TableColumnRef[];
  customMetricNames?: Record<string, string>;
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  const t = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const tTypes = useTranslations("campaignTypes");

  function label(col: TableColumnRef): string {
    if (col.kind === "field") return t(COLUMN_I18N_KEYS[col.id] as "colCampaign");
    if (col.kind === "metric") return tMetrics(METRIC_BY_KEY[col.key].label);
    if (col.kind === "meta_action") {
      const known = META_ACTION_CATALOG.find((a) => a.actionType === col.actionType);
      return known?.label ?? col.actionType;
    }
    if (col.kind === "custom") return customMetricNames?.[col.id] ?? tTypes("customMetric");
    return "";
  }

  return (
    <>
      {columns.map((col) => {
        const key = columnRefKey(col);
        const isMetric = col.kind !== "field";
        const thAlign = isMetric ? "text-right" : "text-left";
        return (
          <th key={key} className={`px-3 py-2 ${thAlign}`}>
            {onSort && isMetric ? (
              <button type="button" onClick={() => onSort(key)} className="hover:text-slate-700">
                {label(col)}
                {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </button>
            ) : (
              label(col)
            )}
          </th>
        );
      })}
    </>
  );
}

export function CampaignTableCell({
  col,
  row,
  customMetrics,
  className = "px-3 py-2.5"
}: {
  col: TableColumnRef;
  row: MetricRowData & {
    campaignName?: string;
    clientName?: string;
    accountLabel?: string;
    status?: string;
    alertCount?: number;
    hasAlert?: boolean;
  };
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  className?: string;
}) {
  const locale = useLocale();
  const align = col.kind === "field" && col.id === "campaign" ? "text-left" : col.kind === "field" ? "text-left" : "text-right tabular-nums";

  if (col.kind === "field") {
    let content: string = "—";
    switch (col.id) {
      case "campaign":
        content = row.campaignName ?? "—";
        break;
      case "client":
        content = row.clientName ?? "—";
        break;
      case "account":
        content = row.accountLabel ?? "—";
        break;
      case "status":
        content = row.status ?? "—";
        break;
      case "alerts":
        content = row.hasAlert ? String(row.alertCount ?? 0) : "—";
        break;
      case "spend":
        content = formatBRL(row.spend ?? 0, locale);
        break;
      case "conversions":
        content = String(row.conversions ?? 0);
        break;
      case "cpa":
        content = row.cpa != null ? formatBRL(row.cpa, locale) : "—";
        break;
      case "roas":
        content = formatRoas(row.roas ?? 0, locale);
        break;
      default:
        break;
    }
    return <td className={`${className} ${align} text-slate-700`}>{content}</td>;
  }

  const val = resolveColumnNumericValue(col, row, customMetrics, evaluateFormula);
  let content = "—";
  if (val != null) {
    if (col.kind === "metric") content = formatMetricValue(col.key, val, locale);
    else if (col.kind === "custom") {
      const fmt = customMetrics[col.id]?.format ?? "number";
      if (fmt === "currency") content = formatBRL(val, locale);
      else if (fmt === "percent") content = formatPercent(val, 2, locale);
      else if (fmt === "multiplier") content = formatRoas(val, locale);
      else content = val.toLocaleString(locale === "en" ? "en-US" : "pt-BR", { maximumFractionDigits: 2 });
    } else {
      content = val.toLocaleString(locale === "en" ? "en-US" : "pt-BR", { maximumFractionDigits: 0 });
    }
  }

  return <td className={`${className} ${align} text-slate-700`}>{content}</td>;
}
