"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

import { DsButton } from "@/design-system";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

export type ConsolidatedSummary = Partial<Record<MetricKey, number>>;
export type ConsolidatedRow = {
  clientId: string;
  clientSlug: string;
  name: string;
  summary: ConsolidatedSummary;
};
export type ConsolidatedData = {
  rows: ConsolidatedRow[];
  totals: ConsolidatedSummary;
  period: { currentLabel: string };
};

const COLS: MetricKey[] = ["spend", "conversions", "cpa", "roas", "ctr"];

type Props = {
  data: ConsolidatedData;
  locale: string;
  onExportCsv?: () => void;
};

export function ReportsConsolidatedPreview({ data, locale, onExportCsv }: Props) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-main)]">{t("consolidatedTitle")}</h2>
          {data.period?.currentLabel ? (
            <p className="mt-1 text-xs text-[var(--text-dim)]">{data.period.currentLabel}</p>
          ) : null}
        </div>
        {onExportCsv ? (
          <DsButton
            variant="secondary"
            size="sm"
            onClick={onExportCsv}
            disabled={!data.rows.length}
            className="inline-flex items-center gap-1.5"
          >
            <Download size={13} aria-hidden />
            {t("exportCsv")}
          </DsButton>
        ) : null}
      </div>

      {!data.rows.length ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-main)]">{t("consolidatedEmpty")}</p>
          <p className="mt-2 text-xs text-[var(--text-dim)]">{t("consolidatedEmptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-[11px] uppercase tracking-wide text-[var(--text-dimmer)]">
                <th className="py-2 pr-3 font-medium">{tCommon("client")}</th>
                {COLS.map((k) => (
                  <th key={k} className="py-2 px-3 text-right font-medium">
                    {tMetrics(METRIC_BY_KEY[k].label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.clientId} className="border-b border-[var(--border-color)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">{r.name}</td>
                  {COLS.map((k) => (
                    <td key={k} className="py-2 px-3 text-right text-[var(--text-dim)]">
                      {formatMetricValue(k, r.summary[k] ?? 0, locale)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold text-[var(--text-main)]">
                <td className="py-2 pr-3">TOTAL</td>
                {COLS.map((k) => (
                  <td key={k} className="py-2 px-3 text-right">
                    {formatMetricValue(k, data.totals[k] ?? 0, locale)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function exportConsolidatedCsv(data: ConsolidatedData, tMetrics: (key: string) => string) {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Cliente", ...COLS.map((k) => tMetrics(METRIC_BY_KEY[k].label))];
  const lines = [header.map(cell).join(";")];
  for (const r of data.rows) {
    lines.push([r.name, ...COLS.map((k) => r.summary[k] ?? 0)].map(cell).join(";"));
  }
  lines.push(["TOTAL", ...COLS.map((k) => data.totals[k] ?? 0)].map(cell).join(";"));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "consolidado-agencia.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
