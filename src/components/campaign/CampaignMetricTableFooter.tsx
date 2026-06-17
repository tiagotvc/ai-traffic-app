"use client";

import { useLocale } from "next-intl";

import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { columnRefKey, type TableColumnRef } from "@/lib/campaign-table-layout";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import {
  STICKY_NAME_TF,
  STICKY_STATUS_TF
} from "@/lib/campaign-table-sticky";

type Props = {
  rowCount: number;
  totalLabel: string;
  metricColumns: TableColumnRef[];
  totals: Record<string, number | null>;
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  middleCells?: React.ReactNode;
  trailingCells?: React.ReactNode;
};

export function CampaignMetricTableFooter({
  rowCount,
  totalLabel,
  metricColumns,
  totals,
  customMetrics,
  middleCells,
  trailingCells
}: Props) {
  const locale = useLocale();

  return (
    <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
      <tr>
        <td className={`${STICKY_STATUS_TF} text-slate-400`}>—</td>
        <td className={STICKY_NAME_TF}>
          {totalLabel} ({rowCount})
        </td>
        {middleCells}
        {metricColumns.map((col) => {
          const key = columnRefKey(col);
          const val = totals[key];
          let content = "—";
          if (val != null && col.kind === "metric") {
            content = formatMetricValue(col.key, val, locale);
          } else if (val != null && col.kind === "custom") {
            const fmt = customMetrics[col.id]?.format ?? "number";
            if (fmt === "currency") content = formatBRL(val, locale);
            else if (fmt === "percent") content = formatPercent(val, 2, locale);
            else if (fmt === "multiplier") content = formatRoas(val, locale);
            else content = String(Math.round(val * 100) / 100);
          } else if (val != null) {
            content = String(val);
          }
          return (
            <td
              key={key}
              className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-900"
            >
              {content}
            </td>
          );
        })}
        {trailingCells}
      </tr>
    </tfoot>
  );
}

/** Célula de métrica no footer quando já calculada via CampaignTableCell. */
export function CampaignMetricFooterCells({
  metricColumns,
  totals,
  customMetrics
}: {
  metricColumns: TableColumnRef[];
  totals: Record<string, number | null>;
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
}) {
  return (
    <>
      {metricColumns.map((col) => (
        <CampaignTableCell
          key={columnRefKey(col)}
          col={col}
          row={totals as Record<string, number>}
          customMetrics={customMetrics}
          className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-900"
        />
      ))}
    </>
  );
}
