"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";

import ReportsContent from "@/uxpilot-ui/pages/content/Reports";
import {
  toClientSpendBreakdown,
  toMonthlyChartData,
  toReportKpis,
  toReportList
} from "@/uxpilot-ui/adapters/reports-mappers";
import { useReportsData } from "@/uxpilot-ui/adapters/useReportsData";

export function ReportsContentLive() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const data = useReportsData();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monthlyData = useMemo(() => toMonthlyChartData(data.series), [data.series]);
  const clientSpendBreakdown = useMemo(
    () => toClientSpendBreakdown(data.campaigns, data.pieColors),
    [data.campaigns, data.pieColors]
  );
  const reportList = useMemo(() => toReportList(data.schedules, locale), [data.schedules, locale]);
  const kpis = useMemo(() => toReportKpis(data.summary, locale), [data.summary, locale]);

  const onGenerate = useCallback(() => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 30, template: "performance" })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setMessage((j as { error?: string })?.error ?? t("pdfFailed"));
        return;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const j = await res.json();
        if (j.emailed) {
          setMessage(t("pdfEmailed", { email: j.to }));
          return;
        }
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-agencia.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setMessage(t("pdfDownloaded"));
    });
  }, [t]);

  return (
    <>
      <ReportsContent
        live={{
          monthlyData,
          clientSpendBreakdown,
          reportList,
          kpis,
          loading: data.loading,
          onGenerate,
          generating: isPending
        }}
      />
      {message ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 font-body text-sm shadow-xl" style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", color: "var(--text-main)" }}>
          {message}
        </div>
      ) : null}
    </>
  );
}
