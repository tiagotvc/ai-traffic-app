"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, LayoutList } from "lucide-react";

import { DsButton, DsModal } from "@/design-system";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

type Summary = Partial<Record<MetricKey, number>>;
type Row = { clientId: string; clientSlug: string; name: string; summary: Summary };
type Data = { rows: Row[]; totals: Summary; period: { currentLabel: string } };

const COLS: MetricKey[] = ["spend", "conversions", "cpa", "roas", "ctr"];

/** R3 — painel do relatório consolidado da agência (carteira). Gate v2 fica no pai. */
export function ReportsConsolidatedPanel({
  periodQuery,
  locale
}: {
  periodQuery: string;
  locale: string;
}) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/consolidated?${periodQuery}&locale=${locale}`);
      const j = await res.json();
      if (j?.ok) setData(j as Data);
    } finally {
      setLoading(false);
    }
  }

  function openPanel() {
    setOpen(true);
    if (!data) void load();
  }

  function exportCsv() {
    if (!data) return;
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
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "consolidado-agencia.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="ui-btn-secondary inline-flex items-center gap-1.5"
      >
        <LayoutList size={14} aria-hidden />
        {t("consolidatedButton")}
      </button>

      <DsModal
        open={open}
        onClose={() => setOpen(false)}
        title={t("consolidatedTitle")}
        subtitle={data?.period?.currentLabel}
        titleIcon={<LayoutList size={15} strokeWidth={2.25} />}
        width="lg"
        footer={
          <>
            <DsButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {tCommon("close")}
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              onClick={exportCsv}
              disabled={!data?.rows.length}
              className="inline-flex items-center gap-1.5"
            >
              <Download size={13} aria-hidden />
              {t("exportCsv")}
            </DsButton>
          </>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--text-dim)]">{tCommon("loading")}</p>
        ) : !data || !data.rows.length ? (
          <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("consolidatedEmpty")}</p>
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
      </DsModal>
    </>
  );
}
