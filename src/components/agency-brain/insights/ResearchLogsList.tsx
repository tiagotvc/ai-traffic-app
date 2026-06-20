"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ResearchLogDetailsPanel } from "@/components/agency-brain/insights/ResearchLogDetailsPanel";
import { hasLogDetails } from "@/lib/agency-brain/insights/research-log-repository";
import type { ResearchLogEntry, ResearchLogType } from "@/lib/agency-brain/insights/types";

const TYPE_STYLES: Record<ResearchLogType, string> = {
  refine: "bg-[rgba(124,58,237,0.06)]0/10 text-[var(--violet)] border-violet-500/20",
  market_scan: "bg-blue-500/10 text-blue-800 border-blue-500/20",
  pattern_detect: "bg-[var(--surface-thead)]0/10 text-[var(--text-dim)] border-[var(--border-color)]",
  ai_analysis: "bg-fuchsia-500/10 text-fuchsia-800 border-fuchsia-500/20",
  market_synthesis: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
};

const STATUS_DOT: Record<ResearchLogEntry["status"], string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500"
};

function formatWhen(date: string, locale: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ResearchLogCard({ log }: { log: ResearchLogEntry }) {
  const t = useTranslations("brainInsights");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const showDetails = hasLogDetails(log.details);

  return (
    <li className="ui-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLES[log.type]}`}
          >
            {t(`researchLogType.${log.type}`)}
          </span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[log.status]}`} />
          <p className="text-sm font-semibold text-[var(--text-main)]">{log.title}</p>
        </div>
        <time className="shrink-0 text-xs tabular-nums text-[var(--text-dimmer)]">
          {formatWhen(log.createdAt, locale)}
        </time>
      </div>

      <p className="mt-1.5 text-sm text-[var(--text-dim)]">{log.detail}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-dim)]">
        {log.pointsUsed != null ? (
          <span>{t("researchLogPoints", { count: log.pointsUsed })}</span>
        ) : null}
        {log.adsAnalyzed != null && log.adsAnalyzed > 0 ? (
          <span>{t("researchLogAds", { count: log.adsAnalyzed })}</span>
        ) : null}
        {log.patternsFound != null && log.patternsFound > 0 ? (
          <span>{t("researchLogPatterns", { count: log.patternsFound })}</span>
        ) : null}
        {log.learningsCreated != null && log.learningsCreated > 0 ? (
          <span>{t("researchLogLearnings", { count: log.learningsCreated })}</span>
        ) : null}
        {log.marketInsights != null && log.marketInsights > 0 ? (
          <span>{t("researchLogMarket", { count: log.marketInsights })}</span>
        ) : null}
        {showDetails ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ui-link font-medium"
          >
            {expanded ? t("logDetailHide") : t("logDetailShow")}
          </button>
        ) : null}
      </div>

      {expanded && log.details ? <ResearchLogDetailsPanel details={log.details} /> : null}
    </li>
  );
}

export function ResearchLogsList({ logs }: { logs: ResearchLogEntry[] }) {
  const t = useTranslations("brainInsights");

  if (logs.length === 0) {
    return (
      <p className="ui-card border-dashed px-6 py-12 text-center text-sm text-[var(--text-dim)]">
        {t("researchLogsEmpty")}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {logs.map((log) => (
        <ResearchLogCard key={log.id} log={log} />
      ))}
    </ol>
  );
}
