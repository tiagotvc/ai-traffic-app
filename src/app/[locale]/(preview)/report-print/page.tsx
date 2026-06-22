import type { Metadata } from "next";

import { ReportPrintReady } from "@/components/reports/ReportPrintReady";
import { ReportPreview } from "@/components/reports/ReportPreview";
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

  const bundle = await loadReportPrintBundle(query);
  if (!bundle.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-sm text-slate-600">
        Não foi possível carregar o relatório ({bundle.error}).
      </div>
    );
  }

  return (
    <ReportPrintReady>
      <ReportPreview
        data={bundle.payload}
        selectedMetrics={bundle.selectedMetrics}
        reportType={bundle.reportType}
        periodQuery={bundle.periodQuery}
        adAccountId={bundle.adAccountId ?? undefined}
        variant="print"
      />
    </ReportPrintReady>
  );
}

function pick(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
