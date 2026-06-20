"use client";

import { useLocale } from "next-intl";

import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { columnRefKey, type TableColumnRef } from "@/lib/campaign-table-layout";

type Props = {
  rowCount: number;
  totalLabel: string;
  /** Colunas à esquerda das métricas (nome, status, etc.) */
  leadingColSpan: number;
  metricColumns: TableColumnRef[];
  totals: Record<string, number | null>;
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  trailingColSpan?: number;
};

export function CampaignTableSimpleFooter({
  rowCount,
  totalLabel,
  leadingColSpan,
  metricColumns,
  totals,
  customMetrics,
  trailingColSpan = 0
}: Props) {
  useLocale();

  return (
    <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--surface-thead)]/80">
      <tr>
        <td
          colSpan={leadingColSpan}
          className="px-4 py-2.5 text-left text-sm font-semibold text-[var(--text-main)]"
        >
          {totalLabel} ({rowCount})
        </td>
        {metricColumns.map((col) => (
          <CampaignTableCell
            key={columnRefKey(col)}
            col={col}
            row={totals as Record<string, number>}
            customMetrics={customMetrics}
            className="px-3 py-2.5 text-center font-semibold tabular-nums text-[var(--text-main)]"
          />
        ))}
        {trailingColSpan > 0 ? (
          <td colSpan={trailingColSpan} className="px-3 py-2.5 text-center text-[var(--text-dimmer)]">
            —
          </td>
        ) : null}
      </tr>
    </tfoot>
  );
}
