"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ConfidencePill } from "@/components/agency-brain/insights/ConfidencePill";
import { EvidenceSourcesRow } from "@/components/agency-brain/insights/EvidenceSources";
import { Link } from "@/i18n/navigation";
import type { ImpactLevel, InsightLearning } from "@/lib/agency-brain/insights/types";
import { cn } from "@/lib/cn";

const impactConfig: Record<
  ImpactLevel,
  { color: string; bg: string; border: string; label: string }
> = {
  high: { color: "#059669", bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.25)", label: "Alto" },
  medium: { color: "#d97706", bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.25)", label: "Médio" },
  low: { color: "#64748b", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.20)", label: "Baixo" }
};

export function LearningFeedCard({
  learning,
  expanded: controlledExpanded,
  onToggle
}: {
  learning: InsightLearning;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const t = useTranslations("brainInsights");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const imp = impactConfig[learning.impactLevel];

  function handleToggle() {
    if (onToggle) onToggle();
    else setInternalExpanded((v) => !v);
  }

  return (
    <div
      className="animate-fade-up cursor-pointer overflow-hidden rounded-xl border transition-all duration-200"
      style={{
        background: "var(--surface-card)",
        borderColor: expanded ? "#FACC15" : "var(--border-color)",
        boxShadow: expanded ? "0 0 0 1px rgba(250,204,21,0.25), 0 8px 24px rgba(0,0,0,0.12)" : "none"
      }}
      onClick={handleToggle}
      onMouseEnter={(e) => {
        if (!expanded) {
          e.currentTarget.style.borderColor = "rgba(250,204,21,0.4)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!expanded) {
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div
        className="h-0.5 w-full"
        style={{
          background: expanded ? "linear-gradient(90deg,#FACC15,#f5a623)" : "transparent"
        }}
      />

      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(124,58,237,0.10)",
                  color: "#7c3aed",
                  borderColor: "rgba(124,58,237,0.22)"
                }}
              >
                {t("badgeLearning")}
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
              >
                {t(`learningStatus.${learning.status}`).toUpperCase()}
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
              >
                {t("impactLabel")} {imp.label}
              </span>
            </div>

            <h2
              className="mb-1.5 text-sm font-semibold leading-snug"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              {learning.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {learning.description}
            </p>
          </div>

          <svg
            className={cn("mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200", expanded && "rotate-90")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: expanded ? "#FACC15" : "var(--text-dimmer)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-dimmer)" }}>
              {t("confidenceLabel")}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              {learning.confidenceScore}%
            </span>
            <ConfidencePill score={learning.confidenceScore} variant="bar" />
          </div>

          {learning.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {learning.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2 py-0.5 text-[11px]"
                  style={{
                    background: "rgba(250,204,21,0.07)",
                    color: "var(--amber-bright)",
                    borderColor: "rgba(250,204,21,0.18)"
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <p
          className="mt-3 border-t pt-3 text-xs leading-relaxed"
          style={{ color: "var(--text-dimmer)", borderColor: "var(--border-color)" }}
        >
          {learning.evidenceSummary}
        </p>

        {learning.sources.length > 0 ? (
          <div className="mt-2.5">
            <EvidenceSourcesRow sources={learning.sources} compact variant="uxpilot" />
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div
          className="flex items-center gap-2.5 border-t px-5 py-3.5"
          style={{ borderColor: "rgba(250,204,21,0.2)", background: "rgba(250,204,21,0.04)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/agency-brain/learnings/${learning.id}`}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-all hover:brightness-110"
            style={{
              background: "var(--surface-bg)",
              borderColor: "#f5a623",
              color: "#f5a623",
              fontFamily: "var(--font-heading)"
            }}
          >
            {t("viewTimeline")}
          </Link>
          <button
            type="button"
            className="ui-btn-brand !px-4 !py-2 text-xs opacity-60"
            disabled
            title={t("generateHypothesisSoon")}
          >
            {t("generateHypothesis")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
