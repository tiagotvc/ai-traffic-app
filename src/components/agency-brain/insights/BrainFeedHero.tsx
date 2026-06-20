"use client";

import { useTranslations } from "next-intl";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import { EvidenceSourcesLegend } from "@/components/agency-brain/insights/EvidenceSources";
import { RefineResearchBar } from "@/components/agency-brain/insights/RefineResearchBar";
import type { FeedVariant } from "@/lib/agency-brain/insights/types";

export function BrainFeedHero({
  variant,
  clientId,
  onRefineComplete
}: {
  variant: FeedVariant;
  clientId: string;
  onRefineComplete?: () => void;
}) {
  const t = useTranslations("brainInsights");
  const isLearnings = variant === "learnings";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--text-dim)" }}>
            Agency Brain
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(245,166,35,0.15)" }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#f5a623"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              Agency Brain
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
            {t(isLearnings ? "learningsFeedSubtitle" : "hypothesesFeedSubtitle")}
          </p>
        </div>

        {isLearnings ? (
          <RefineResearchBar clientId={clientId} onComplete={onRefineComplete} />
        ) : null}
      </div>

      {isLearnings ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium" style={{ color: "var(--text-dimmer)" }}>
            {t("sourcesLegend")}:
          </span>
          <EvidenceSourcesLegend variant="uxpilot" />
          <div className="ml-auto">
            <AgencyBrainAiBar variant="uxpilot" />
          </div>
        </div>
      ) : null}
    </>
  );
}
