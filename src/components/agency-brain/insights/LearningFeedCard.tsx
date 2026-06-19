"use client";

import { useTranslations } from "next-intl";

import { ConfidencePill } from "@/components/agency-brain/insights/ConfidencePill";
import { EvidenceSourcesRow } from "@/components/agency-brain/insights/EvidenceSources";
import { ImpactPill } from "@/components/agency-brain/insights/ImpactPill";
import { StatusBadge } from "@/components/agency-brain/insights/StatusBadge";
import { Link } from "@/i18n/navigation";
import type { InsightLearning } from "@/lib/agency-brain/insights/types";

export function LearningFeedCard({ learning }: { learning: InsightLearning }) {
  const t = useTranslations("brainInsights");

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
          {t("badgeLearning")}
        </span>
        <StatusBadge kind="learning" status={learning.status} />
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
        {learning.title}
      </h2>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {learning.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">
          {t("confidenceLabel")} <ConfidencePill score={learning.confidenceScore} />
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 text-slate-500">
          {t("impactLabel")} <ImpactPill level={learning.impactLevel} />
        </span>
      </div>

      {learning.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
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

      <p className="mt-3 text-xs text-slate-500">{learning.evidenceSummary}</p>

      {learning.sources.length > 0 ? (
        <div className="mt-3">
          <EvidenceSourcesRow sources={learning.sources} compact />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link
          href={`/agency-brain/learnings/${learning.id}`}
          className="ui-btn-secondary !px-3 !py-1.5 text-xs"
        >
          {t("viewTimeline")}
        </Link>
        <button
          type="button"
          className="ui-btn-primary !px-3 !py-1.5 text-xs opacity-60"
          disabled
          title={t("generateHypothesisSoon")}
        >
          {t("generateHypothesis")}
        </button>
      </div>
    </article>
  );
}
