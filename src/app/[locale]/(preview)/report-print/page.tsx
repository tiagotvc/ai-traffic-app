import type { Metadata } from "next";

import { ReportPrintReady } from "@/components/reports/ReportPrintReady";
import { ReportPrintToolbar } from "@/components/reports/ReportPrintToolbar";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { parseBreakdownLayoutParam } from "@/lib/report-breakdown-layout";
import { loadReportPrintBundle, type ReportPrintQuery } from "@/lib/report-print-data";

import "@/styles/report-print.css";

export const metadata: Metadata = {
  robots: "noindex, nofollow"
};

export default async function ReportPrintPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query: ReportPrintQuery = {
    pdfToken: pick(raw.pdfToken),
    clientId: pick(raw.clientId),
    adAccountId: pick(raw.adAccountId),
    type: pick(raw.type),
    locale: pick(raw.locale),
    goalLabel: pick(raw.goalLabel),
    period: pick(raw.period),
    since: pick(raw.since),
    until: pick(raw.until),
    metrics: pick(raw.metrics)
  };

  const breakdownLayout = parseBreakdownLayoutParam(pick(raw.breakdownLayout));

  const bundle = await loadReportPrintBundle(query);
  if (!bundle.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-sm text-slate-600">
        Não foi possível carregar o relatório ({bundle.error}).
      </div>
    );
  }

  return (
    <>
      {!query.pdfToken ? <ReportPrintToolbar locale={bundle.locale} /> : null}
      <ReportPrintReady>
        <ReportPreview
          data={bundle.payload}
          selectedMetrics={bundle.selectedMetrics}
          kpiMetrics={bundle.selectedMetrics.slice(0, 6)}
          reportType={bundle.reportType}
          periodQuery={bundle.periodQuery}
          adAccountId={bundle.adAccountId ?? undefined}
          initialCreativeGroups={bundle.creativeGroups}
          initialBreakdownLayout={breakdownLayout.length ? breakdownLayout : undefined}
          brandName={bundle.brandName ?? undefined}
          logoUrl={bundle.logoUrl ?? undefined}
          variant="print"
        />
      </ReportPrintReady>
    </>
  );
}

function pick(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
