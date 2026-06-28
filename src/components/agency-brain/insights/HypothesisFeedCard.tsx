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
    <article className="campaign-creator-card campaign-creator-card--compact transition hover:border-[var(--ui-accent-border)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="ds-table-compact-badge ds-table-compact-badge--accent">
          {t("badgeHypothesis")}
        </span>
        <StatusBadge kind="hypothesis" status={hypothesis.status} />
      </div>

      <h2 className="mt-2.5 font-heading text-sm font-semibold leading-snug text-[var(--text-main)] sm:text-base">
        {hypothesis.title}
      </h2>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--text-dim)]">
        {hypothesis.description}
      </p>

      <dl className="mt-2.5 space-y-1 text-sm">
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--creator-card-border)] pt-3">
        <Link href={`/agency-brain/hypotheses/${hypothesis.id}`} className="ds-table-compact-action">
          {t("viewPlan")}
        </Link>
        {hypothesis.status === "pending" || hypothesis.status === "testing" ? (
          <span className="text-xs text-[var(--text-dimmer)]">{t("updateStatusHint")}</span>
        ) : null}
      </div>
    </article>
  );
}
