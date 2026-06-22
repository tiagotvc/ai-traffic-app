"use client";

import { useTranslations } from "next-intl";

export function ReportPrintToolbar({ locale }: { locale: string }) {
  const t = useTranslations("reports");

  return (
    <div className="report-print-toolbar no-print">
      <p className="text-sm text-slate-700">{t("printToolbarHint")}</p>
      <p className="mt-1 text-xs text-slate-500">{t("printToolbarCtrlP")}</p>
      <a
        href={`/${locale}/reports`}
        className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
      >
        {t("printToolbarBack")}
      </a>
    </div>
  );
}
