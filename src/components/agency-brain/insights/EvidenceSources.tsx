"use client";

import { useTranslations } from "next-intl";

import type { EvidenceSource, EvidenceSourceType } from "@/lib/agency-brain/insights/types";

const SOURCE_STYLES: Record<EvidenceSourceType, string> = {
  meta_ads: "bg-blue-50 text-blue-800 border-blue-100",
  agency: "bg-[rgba(124,58,237,0.06)] text-[var(--violet)] border-[rgba(124,58,237,0.15)]",
  market: "bg-emerald-50 text-emerald-800 border-emerald-100",
  competitor: "bg-amber-500/10 text-amber-800 border-amber-100",
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

const SOURCE_UX: Record<
  EvidenceSourceType,
  { color: string; bg: string }
> = {
  meta_ads: { color: "#1877F2", bg: "rgba(24,119,242,0.09)" },
  agency: { color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
  market: { color: "#10b981", bg: "rgba(16,185,129,0.09)" },
  competitor: { color: "#f5a623", bg: "rgba(245,166,35,0.09)" },
  hypothesis: { color: "#6366f1", bg: "rgba(99,102,241,0.09)" }
};

export function EvidenceSourcePill({
  source,
  compact,
  variant = "default"
}: {
  source: EvidenceSource;
  compact?: boolean;
  variant?: "default" | "uxpilot";
}) {
  if (variant === "uxpilot") {
    const ux = SOURCE_UX[source.type];
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
        style={{
          background: ux.bg,
          color: ux.color,
          borderColor: `${ux.color}22`
        }}
        title={source.detail}
      >
        <SourceIcon type={source.type} />
        {source.label}
      </span>
    );
  }

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
  compact,
  variant = "default"
}: {
  sources: EvidenceSource[];
  compact?: boolean;
  variant?: "default" | "uxpilot";
}) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <EvidenceSourcePill
          key={`${source.type}-${source.label}`}
          source={source}
          compact={compact}
          variant={variant}
        />
      ))}
    </div>
  );
}

const SOURCE_LEGEND_UX: Array<{ type: EvidenceSourceType; color: string; bg: string }> = [
  { type: "meta_ads", color: "#1877F2", bg: "rgba(24,119,242,0.08)" },
  { type: "agency", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  { type: "market", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  { type: "competitor", color: "#f5a623", bg: "rgba(245,166,35,0.08)" },
  { type: "hypothesis", color: "#6366f1", bg: "rgba(99,102,241,0.08)" }
];

export function EvidenceSourcesLegend({ variant = "default" }: { variant?: "default" | "uxpilot" }) {
  const t = useTranslations("brainInsights");

  if (variant === "uxpilot") {
    // v1: mostrar apenas as fontes REAIS das descobertas automáticas (dados do cliente + regras/IA).
    // Mercado/Concorrência/Hipótese dependem do "Refinar pesquisas" (oculto na v1) e voltam na v2.
    const realSources = SOURCE_LEGEND_UX.filter(
      (s) => s.type === "meta_ads" || s.type === "agency"
    );
    return (
      <>
        {realSources.map((s) => (
          <span
            key={s.type}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ background: s.bg, color: s.color, borderColor: `${s.color}33` }}
          >
            <SourceIcon type={s.type} />
            {t(`sourceType.${s.type}`)}
          </span>
        ))}
      </>
    );
  }

  const types: EvidenceSourceType[] = ["meta_ads", "agency", "market", "competitor", "hypothesis"];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-dim)]">
      <span className="font-medium text-[var(--text-dim)]">{t("sourcesLegend")}</span>
      {types.map((type) => (
        <span key={type} className="inline-flex items-center gap-1">
          <SourceIcon type={type} />
          {t(`sourceType.${type}`)}
        </span>
      ))}
    </div>
  );
}
