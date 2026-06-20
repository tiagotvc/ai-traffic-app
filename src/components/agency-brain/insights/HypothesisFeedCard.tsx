"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/agency-brain/insights/StatusBadge";
import { Link } from "@/i18n/navigation";
import type { InsightHypothesis } from "@/lib/agency-brain/insights/types";

export function HypothesisFeedCard({
  hypothesis,
  learningTitle
}: {
  hypothesis: InsightHypothesis;
  learningTitle: string;
}) {
  const t = useTranslations("brainInsights");

  return (
    <article className="ui-card p-5 transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
          {t("badgeHypothesis")}
        </span>
        <StatusBadge kind="hypothesis" status={hypothesis.status} />
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug text-[var(--text-main)] sm:text-lg">
        {hypothesis.title}
      </h2>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-dim)]">
        {hypothesis.description}
      </p>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex flex-wrap gap-x-1">
          <dt className="text-[var(--text-dim)]">{t("expectedOutcomeLabel")}</dt>
          <dd className="font-medium text-[var(--text-main)]">{hypothesis.expectedOutcome}</dd>
        </div>
        {learningTitle ? (
          <div className="flex flex-wrap gap-x-1">
            <dt className="text-[var(--text-dim)]">{t("originLearningLabel")}</dt>
            <dd className="text-[var(--text-dim)]">{learningTitle}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
        <Link
          href={`/agency-brain/hypotheses/${hypothesis.id}`}
          className="ui-btn-secondary !px-3 !py-1.5 text-xs"
        >
          {t("viewPlan")}
        </Link>
        {hypothesis.status === "pending" || hypothesis.status === "testing" ? (
          <span className="text-xs text-[var(--text-dimmer)]">{t("updateStatusHint")}</span>
        ) : null}
      </div>
    </article>
  );
}
