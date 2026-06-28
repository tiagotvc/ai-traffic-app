"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ConfidencePill } from "@/components/agency-brain/insights/ConfidencePill";
import { EvidenceSourcesRow } from "@/components/agency-brain/insights/EvidenceSources";
import { DsAccentOutlineButton } from "@/design-system";
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
  onToggle,
  onTimeline,
  onApprove,
  onReject,
  onGenerateHypothesis,
  busy = false
}: {
  learning: InsightLearning;
  expanded?: boolean;
  onToggle?: () => void;
  onTimeline?: () => void;
  onApprove?: (learning: InsightLearning) => void;
  onReject?: (learning: InsightLearning) => void;
  onGenerateHypothesis?: (learning: InsightLearning) => void;
  busy?: boolean;
}) {
  const t = useTranslations("brainInsights");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const imp = impactConfig[learning.impactLevel];
  const isSuggested = learning.reviewStatus === "SUGGESTED";

  function handleToggle() {
    if (onToggle) onToggle();
    else setInternalExpanded((v) => !v);
  }

  return (
    <div
      className={cn(
        "campaign-creator-card campaign-creator-card--compact animate-fade-up cursor-pointer overflow-hidden p-0 transition-all duration-200",
        expanded && "border-[var(--ui-accent-border)] shadow-[0_0_0_1px_var(--ui-accent-border),0_8px_24px_rgba(0,0,0,0.08)]"
      )}
      onClick={handleToggle}
    >
      <div
        className="h-0.5 w-full"
        style={{
          background: expanded
            ? "linear-gradient(90deg, var(--ui-accent), color-mix(in srgb, var(--ui-accent) 40%, transparent))"
            : `linear-gradient(90deg, ${imp.color}66, transparent 70%)`
        }}
      />

      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="ds-table-compact-badge ds-table-compact-badge--accent">
                {t("badgeLearning")}
              </span>
              {isSuggested ? (
                <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
                  {t("badgeSuggested")}
                </span>
              ) : (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
                >
                  {t(`learningStatus.${learning.status}`).toUpperCase()}
                </span>
              )}
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
              >
                {t("impactLabel")} {imp.label}
              </span>
            </div>

            <h2 className="mb-1.5 font-heading text-sm font-semibold leading-snug text-[var(--text-main)]">
              {learning.title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-dim)]">{learning.description}</p>
          </div>

          <svg
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200",
              expanded && "rotate-90 text-[var(--ui-accent)]"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: expanded ? undefined : "var(--text-dimmer)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dimmer)]">{t("confidenceLabel")}</span>
            <span className="font-heading text-xs font-bold text-[var(--text-main)]">
              {learning.confidenceScore}%
            </span>
            <ConfidencePill score={learning.confidenceScore} variant="bar" />
          </div>

          {learning.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {learning.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] text-[var(--ui-accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <p className="mt-3 border-t border-[var(--creator-card-border)] pt-3 text-xs leading-relaxed text-[var(--text-dimmer)]">
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
          className="flex items-center gap-2 border-t border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <DsAccentOutlineButton onClick={() => onTimeline?.()} className="px-3 py-1.5">
            {t("viewTimeline")}
          </DsAccentOutlineButton>

          {isSuggested ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove?.(learning)}
                className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {t("approveLearning")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject?.(learning)}
                className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {t("dismissLearning")}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onGenerateHypothesis?.(learning)}
              className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {t("generateHypothesis")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
