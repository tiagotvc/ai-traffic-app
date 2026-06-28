"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

import { EvidenceSourcesLegend } from "@/components/agency-brain/insights/EvidenceSources";
import { DsPageHeader } from "@/design-system";
import type { FeedVariant } from "@/lib/agency-brain/insights/types";

export function BrainFeedHero({ variant }: { variant: FeedVariant }) {
  const t = useTranslations("brainInsights");
  const isLearnings = variant === "learnings";

  return (
    <>
      <DsPageHeader
        className="mb-0"
        title={t("heroTitle")}
        subtitle={t(isLearnings ? "learningsFeedSubtitle" : "hypothesesFeedSubtitle")}
        titleIcon={<Lightbulb size={16} aria-hidden />}
      />

      {isLearnings ? (
        <div className="mb-4 mt-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-dimmer)]">
            {t("sourcesLegend")}:
          </span>
          <EvidenceSourcesLegend variant="uxpilot" />
        </div>
      ) : null}
    </>
  );
}
