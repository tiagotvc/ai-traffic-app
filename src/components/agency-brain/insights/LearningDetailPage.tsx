"use client";

import { useTranslations } from "next-intl";

import { BrainBreadcrumb } from "@/components/agency-brain/insights/BrainBreadcrumb";
import { ConfidencePill } from "@/components/agency-brain/insights/ConfidencePill";
import { EvidenceBlock } from "@/components/agency-brain/insights/EvidenceBlock";
import { EvidenceSourcesRow } from "@/components/agency-brain/insights/EvidenceSources";
import { ImpactPill } from "@/components/agency-brain/insights/ImpactPill";
import { LearningTimeline } from "@/components/agency-brain/insights/LearningTimeline";
import { RelatedHypothesesList } from "@/components/agency-brain/insights/RelatedHypothesesList";
import { StatusBadge } from "@/components/agency-brain/insights/StatusBadge";
import { useBrainInsights } from "@/components/agency-brain/insights/useBrainInsights";

export function LearningDetailPage({ learningId }: { learningId: string }) {
  const t = useTranslations("brainInsights");
  const insights = useBrainInsights();

  const learning = insights.getLearningById(learningId);
  if (!learning) {
    return (
      <p className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">
        {t("learningNotFound")}
      </p>
    );
  }

  const timeline = insights.getTimelineForLearning(learningId);
  const hypotheses = insights.getHypothesesForLearning(learningId);

  return (
    <div className="space-y-6">
      <BrainBreadcrumb title={learning.title} />

      <section className="ui-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[rgba(124,58,237,0.06)]0/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--violet)]">
            {t("badgeLearning")}
          </span>
          <StatusBadge kind="learning" status={learning.status} />
        </div>

        <h1 className="font-heading mt-3 font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">{learning.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{learning.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[var(--text-dim)]">
            {t("confidenceLabel")} <ConfidencePill score={learning.confidenceScore} />
          </span>
          <span className="text-[var(--text-dimmer)]">•</span>
          <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
            {t("impactLabel")} <ImpactPill level={learning.impactLevel} />
          </span>
        </div>

        {learning.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {learning.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[var(--surface-thead)]0/10 px-2 py-0.5 text-[11px] font-medium text-[var(--text-dim)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {learning.sources.length > 0 ? (
          <div className="mt-4 border-t border-[var(--border-color)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              {t("sourcesTitle")}
            </p>
            <EvidenceSourcesRow sources={learning.sources} />
          </div>
        ) : null}
      </section>

      <EvidenceBlock bullets={learning.whyBelieves} />

      <section className="ui-card p-6">
        <h2 className="font-heading text-sm font-bold text-[var(--text-main)]">{t("timelineTitle")}</h2>
        <div className="mt-4">
          <LearningTimeline events={timeline} />
        </div>
      </section>

      <section className="ui-card p-6">
        <h2 className="font-heading text-sm font-bold text-[var(--text-main)]">{t("relatedHypothesesTitle")}</h2>
        <div className="mt-4">
          <RelatedHypothesesList hypotheses={hypotheses} />
        </div>
      </section>
    </div>
  );
}
