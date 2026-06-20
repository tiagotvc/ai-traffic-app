import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  DollarSign,
  Eye,
  MessageCircle,
  MousePointerClick,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { computeGroupTotals } from "@/lib/campaign-group-totals";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import { columnRefKey, type MetricRowData } from "@/lib/campaign-table-layout";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import type { CustomMetricDef } from "@/lib/campaign-group-totals";
import {
  formatMetricValue,
  METRIC_BY_KEY,
  type MetricKey
} from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";

import type { CampaignTypeDto } from "@/hooks/useCampaignTypes";
import type { CampaignRow } from "@/uxpilot-ui/adapters/useCampaignsData";
import type { UxCampaignKpi } from "@/uxpilot-ui/adapters/campaigns-mappers";

const METRIC_ICONS: Partial<Record<MetricKey, LucideIcon>> = {
  spend: DollarSign,
  roas: TrendingUp,
  impressions: Eye,
  reach: Users,
  clicks: MousePointerClick,
  conversions: Zap,
  messages: MessageCircle,
  cpmsg: DollarSign,
  ctr: BarChart2,
  cpc: DollarSign,
  cpm: DollarSign,
  cpa: BarChart2,
  frequency: BarChart2
};

const AVG_METRICS = new Set<MetricKey>(["ctr", "cpc", "cpm", "cpmsg", "cpa", "frequency", "roas"]);

export function buildCategoryKeys(customTypes: CampaignTypeDto[]): string[] {
  return [...CAMPAIGN_PRESETS, ...customTypes.map((t) => `custom:${t.id}`)];
}

export function resolveCampaignPreset(
  row: CampaignRow,
  presets: Record<string, string>
): string {
  return presets[row.metaCampaignId] ?? row.preset ?? "default";
}

export function categoryLabelFor(
  key: string,
  customTypes: CampaignTypeDto[],
  translatePreset: (key: string) => string
): string {
  if (key.startsWith("custom:")) {
    const id = key.slice("custom:".length);
    return customTypes.find((t) => t.id === id)?.name ?? key;
  }
  return translatePreset(key);
}

function rowToMetricData(row: CampaignRow): MetricRowData {
  return {
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    reach: row.reach,
    frequency: row.frequency,
    conversions: row.conversions,
    leads: row.leads,
    messages: row.messages,
    cpl: row.cpl,
    cpa: row.cpa,
    roas: row.roas,
    ctr: row.ctr,
    cpc: row.cpc,
    cpm: row.cpm,
    actionMetrics: row.actionMetrics
  };
}

function formatCustomMetric(
  value: number,
  format: string | undefined,
  locale: string
): string {
  if (format === "currency") return formatBRL(value, locale);
  if (format === "percent") return formatPercent(value, 2, locale);
  if (format === "multiplier") return formatRoas(value, locale);
  return String(Math.round(value * 100) / 100);
}

export function toCategoryKpis(
  rows: CampaignRow[],
  presets: Record<string, string>,
  categoryKey: string,
  customTypes: CampaignTypeDto[],
  customMetricsMap: Record<string, CustomMetricDef>,
  locale: string,
  metricLabel: (key: MetricKey) => string
): { kpis: UxCampaignKpi[]; count: number } {
  const customTypesMap = customTypesToMap(customTypes);
  const metricColumns = metricsColumnsForPreset(categoryKey, customTypesMap);
  const categoryRows = rows.filter((r) => resolveCampaignPreset(r, presets) === categoryKey);

  if (!categoryRows.length) {
    return {
      count: 0,
      kpis: metricColumns
        .filter((c) => c.kind === "metric" || c.kind === "custom")
        .map((col) => ({
          label:
            col.kind === "metric"
              ? metricLabel(col.key)
              : (customMetricsMap[col.id]?.name ?? col.id),
          value: "—",
          delta: "—",
          icon: BarChart2,
          color: "#94a3b8"
        }))
    };
  }

  const totals = computeGroupTotals(
    categoryRows.map(rowToMetricData),
    metricColumns,
    customMetricsMap
  );

  const kpis: UxCampaignKpi[] = [];

  for (const col of metricColumns) {
    if (col.kind !== "metric" && col.kind !== "custom") continue;
    const key = columnRefKey(col);
    const val = totals[key];
    let value = "—";
    let color = "#94a3b8";
    let label = key;
    let delta = "Total";

    if (val != null && col.kind === "metric") {
      value = formatMetricValue(col.key, val, locale);
      color = METRIC_BY_KEY[col.key].color;
      label = metricLabel(col.key);
      delta = AVG_METRICS.has(col.key) ? "Média" : "Total";
    } else if (val != null && col.kind === "custom") {
      const def = customMetricsMap[col.id];
      value = formatCustomMetric(val, def?.format, locale);
      label = def?.name ?? col.id;
      color = "#7c3aed";
      delta = "Total";
    }

    kpis.push({
      label,
      value,
      delta,
      icon: col.kind === "metric" ? (METRIC_ICONS[col.key] ?? BarChart2) : BarChart2,
      color
    });
  }

  return { kpis, count: categoryRows.length };
}
