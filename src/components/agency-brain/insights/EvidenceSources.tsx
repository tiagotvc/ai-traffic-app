"use client";

import { useTranslations } from "next-intl";

import type { EvidenceSource, EvidenceSourceType } from "@/lib/agency-brain/insights/types";

const SOURCE_STYLES: Record<EvidenceSourceType, string> = {
  meta_ads: "bg-blue-50 text-blue-800 border-blue-100",
  agency: "bg-violet-50 text-violet-800 border-violet-100",
  market: "bg-emerald-50 text-emerald-800 border-emerald-100",
  competitor: "bg-amber-50 text-amber-800 border-amber-100",
  hypothesis: "bg-sky-50 text-sky-800 border-sky-100"
};

function SourceIcon({ type }: { type: EvidenceSourceType }) {
  const paths: Record<EvidenceSourceType, string> = {
    meta_ads:
      "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
    agency:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    market:
      "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
    competitor:
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    hypothesis:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
  };

  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} />
    </svg>
  );
}

export function EvidenceSourcePill({ source, compact }: { source: EvidenceSource; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${SOURCE_STYLES[source.type]}`}
      title={source.detail}
    >
      <SourceIcon type={source.type} />
      <span>{source.label}</span>
      {!compact ? (
        <span className="hidden text-[10px] opacity-75 sm:inline">· {source.detail}</span>
      ) : null}
    </span>
  );
}

export function EvidenceSourcesRow({
  sources,
  compact
}: {
  sources: EvidenceSource[];
  compact?: boolean;
}) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <EvidenceSourcePill key={`${source.type}-${source.label}`} source={source} compact={compact} />
      ))}
    </div>
  );
}

export function EvidenceSourcesLegend() {
  const t = useTranslations("brainInsights");
  const types: EvidenceSourceType[] = ["meta_ads", "agency", "market", "competitor", "hypothesis"];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="font-medium text-slate-600">{t("sourcesLegend")}</span>
      {types.map((type) => (
        <span key={type} className="inline-flex items-center gap-1">
          <SourceIcon type={type} />
          {t(`sourceType.${type}`)}
        </span>
      ))}
    </div>
  );
}
