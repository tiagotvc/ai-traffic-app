import {
  columnRefKey,
  resolveColumnNumericValue,
  type MetricRowData,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { evaluateFormula } from "@/lib/metric-formula";

export type CustomMetricDef = {
  id: string;
  name: string;
  formula: string;
  format: string;
};

export function computeGroupTotals(
  rows: MetricRowData[],
  metricColumns: TableColumnRef[],
  customMetrics: Record<string, CustomMetricDef>
): Record<string, number | null> {
  const totals: MetricRowData = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    conversions: 0,
    messages: 0,
    leads: 0,
    actionMetrics: {}
  };

  for (const row of rows) {
    totals.spend = (totals.spend ?? 0) + (row.spend ?? 0);
    totals.impressions = (totals.impressions ?? 0) + (row.impressions ?? 0);
    totals.clicks = (totals.clicks ?? 0) + (row.clicks ?? 0);
    totals.reach = (totals.reach ?? 0) + (row.reach ?? 0);
    totals.conversions = (totals.conversions ?? 0) + (row.conversions ?? 0);
    totals.messages = (totals.messages ?? 0) + (row.messages ?? 0);
    totals.leads = (totals.leads ?? 0) + (row.leads ?? 0);
    if (row.actionMetrics) {
      for (const [k, v] of Object.entries(row.actionMetrics)) {
        totals.actionMetrics![k] = (totals.actionMetrics![k] ?? 0) + v;
      }
    }
  }

  totals.ctr =
    (totals.impressions ?? 0) > 0 ? ((totals.clicks ?? 0) / totals.impressions!) * 100 : 0;
  totals.cpc = (totals.clicks ?? 0) > 0 ? (totals.spend ?? 0) / totals.clicks! : 0;
  totals.cpm =
    (totals.impressions ?? 0) > 0 ? ((totals.spend ?? 0) / totals.impressions!) * 1000 : 0;
  totals.cpa =
    (totals.conversions ?? 0) > 0 ? (totals.spend ?? 0) / totals.conversions! : null;
  totals.frequency =
    (totals.reach ?? 0) > 0 ? (totals.impressions ?? 0) / totals.reach! : 0;

  const roasWeighted = rows.reduce((sum, r) => sum + (r.roas ?? 0) * (r.spend ?? 0), 0);
  totals.roas = (totals.spend ?? 0) > 0 ? roasWeighted / totals.spend! : 0;

  const result: Record<string, number | null> = {};
  for (const col of metricColumns) {
    if (col.kind === "field") continue;
    result[columnRefKey(col)] = resolveColumnNumericValue(
      col,
      totals,
      customMetrics,
      evaluateFormula
    );
  }
  return result;
}
