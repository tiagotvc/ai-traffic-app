"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { GoogleTableColumnsButton, useGoogleTableColumns } from "@/components/google/GoogleTableColumnsButton";
import type { GoogleTableColumnId } from "@/lib/google-table-columns";

type GoogleHubRow = {
  campaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  status: string;
  channelType: string;
  ctr: number;
  averageCpc: number;
  conversionRate: number;
  costPerConversion: number;
  conversionValue: number;
  valuePerConversion: number;
  cpa: number | null;
  roas: number;
};

/**
 * Tabela de campanhas Google agregadas de TODOS os clientes do tenant,
 * lida dos snapshots (sem sync manual). Aparece no hub quando a plataforma
 * é Google/Ambos e nenhum cliente específico está selecionado.
 */
export function HubGoogleCampaigns({ period, q }: { period: PeriodState; q: string }) {
  const locale = useLocale();
  const t = useTranslations("campaignsPage");
  const tClient = useTranslations("client");

  const [rows, setRows] = useState<GoogleHubRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useGoogleTableColumns("campaigns");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = periodStateToQuery(period);
    if (q) params.set("q", q);
    fetch(`/api/command-center/google-campaigns?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((j) => {
        if (!alive) return;
        setRows(j?.ok && Array.isArray(j.rows) ? (j.rows as GoogleHubRow[]) : []);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period.preset, period.since, period.until, q]);

  if (loading && rows === null) {
    return (
      <div className="mt-4">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-8 text-center">
        <p className="text-sm text-[var(--text-dim)]">{t("googleAllClientsEmpty")}</p>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.spend += r.spend;
      acc.conversions += r.conversions;
      return acc;
    },
    { spend: 0, conversions: 0 }
  );
  const totalCpa = totals.conversions > 0 ? totals.spend / totals.conversions : null;
  const columnValue = (row: GoogleHubRow, column: GoogleTableColumnId) => {
    if (column === "status") return row.status;
    if (column === "channelType") return row.channelType;
    if (column === "type") return "—";
    const value = column === "cost" ? row.spend : row[column];
    if (column === "cost" || column === "averageCpc" || column === "costPerConversion" || column === "conversionValue" || column === "valuePerConversion") return formatBRL(value, locale);
    if (column === "roas") return `${formatNumber(value, locale)}x`;
    if (column === "ctr" || column === "conversionRate") return formatPercent(value * 100, 2, locale);
    return formatNumber(value, locale);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-main)]">
          {t("googleAllClientsTitle")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-dim)]">{rows.length}</span>
          <GoogleTableColumnsButton kind="campaigns" columns={columns} onChange={setColumns} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-dim)]">
              <th className="py-2 pl-4 pr-3 text-left font-medium">
                {tClient("googleAdsColCampaign")}
              </th>
              <th className="py-2 pr-3 text-left font-medium">{t("colClient")}</th>
              {columns.map((column) => <th key={column} className={`py-2 pr-3 font-medium ${column === "status" || column === "channelType" ? "text-left" : "text-right"}`}>{tClient(`googleColumn_${column}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.clientSlug}:${row.campaignId}`}
                className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--surface-bg)]"
              >
                <td className="py-2 pl-4 pr-3">
                  <Link
                    href={`/clients/${row.clientSlug}/google/campaigns/${row.campaignId}`}
                    className="inline-flex items-center gap-1 font-medium text-[var(--text-main)] hover:text-[var(--ui-accent)]"
                  >
                    {row.campaignName}
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
                  </Link>
                </td>
                <td className="py-2 pr-3 text-[var(--text-dim)]">{row.clientName}</td>
                {columns.map((column) => <td key={column} className={`whitespace-nowrap py-2 pr-3 ${column === "status" || column === "channelType" ? "text-left" : "text-right"}`}>{columnValue(row, column)}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border-color)] font-medium">
              <td className="py-2 pl-4 pr-3 text-[var(--text-dim)]" colSpan={2}>
                {t("rowTotal")}
              </td>
              {columns.map((column) => <td key={column} className="py-2 pr-3 text-right">{column === "cost" ? formatBRL(totals.spend, locale) : column === "conversions" ? formatNumber(totals.conversions, locale) : column === "costPerConversion" && totalCpa != null ? formatBRL(totalCpa, locale) : ""}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
