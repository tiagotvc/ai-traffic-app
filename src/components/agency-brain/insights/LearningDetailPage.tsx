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
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("learningNotFound")}
      </p>
    );
  }

  const timeline = insights.getTimelineForLearning(learningId);
  const hypotheses = insights.getHypothesesForLearning(learningId);

  return (
    <div className="space-y-6">
      <BrainBreadcrumb title={learning.title} />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
            {t("badgeLearning")}
          </span>
          <StatusBadge kind="learning" status={learning.status} />
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{learning.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{learning.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-500">
            {t("confidenceLabel")} <ConfidencePill score={learning.confidenceScore} />
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-500">
            {t("impactLabel")} <ImpactPill level={learning.impactLevel} />
          </span>
        </div>

        {learning.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {learning.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {learning.sources.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("sourcesTitle")}
            </p>
            <EvidenceSourcesRow sources={learning.sources} />
          </div>
        ) : null}
      </section>

      <EvidenceBlock bullets={learning.whyBelieves} />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900">{t("timelineTitle")}</h2>
        <div className="mt-4">
          <LearningTimeline events={timeline} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900">{t("relatedHypothesesTitle")}</h2>
        <div className="mt-4">
          <RelatedHypothesesList hypotheses={hypotheses} />
        </div>
      </section>
    </div>
  );
}
