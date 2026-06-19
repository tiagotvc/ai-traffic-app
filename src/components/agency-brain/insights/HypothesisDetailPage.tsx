"use client";

import { useTranslations } from "next-intl";

import { BrainBreadcrumb } from "@/components/agency-brain/insights/BrainBreadcrumb";
import { StatusBadge } from "@/components/agency-brain/insights/StatusBadge";
import { useBrainInsights } from "@/components/agency-brain/insights/useBrainInsights";
import { Link } from "@/i18n/navigation";
import type { HypothesisStatus } from "@/lib/agency-brain/insights/types";

const STATUS_ACTIONS: HypothesisStatus[] = ["validated", "rejected", "inconclusive"];

export function HypothesisDetailPage({ hypothesisId }: { hypothesisId: string }) {
  const t = useTranslations("brainInsights");
  const insights = useBrainInsights();

  const hypothesis = insights.getHypothesisById(hypothesisId);
  if (!hypothesis) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("hypothesisNotFound")}
      </p>
    );
  }

  const learning = insights.getLearningById(hypothesis.learningId);
  const canUpdate = hypothesis.status === "pending" || hypothesis.status === "testing";

  return (
    <div className="space-y-6">
      <BrainBreadcrumb title={hypothesis.title} />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            {t("badgeHypothesis")}
          </span>
          <StatusBadge kind="hypothesis" status={hypothesis.status} />
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{hypothesis.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{hypothesis.description}</p>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t("expectedOutcomeLabel")}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{hypothesis.expectedOutcome}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("targetMetricLabel")}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{hypothesis.targetMetric}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("testPeriodLabel")}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{hypothesis.testPeriod}</dd>
          </div>
          {learning ? (
            <div>
              <dt className="text-slate-500">{t("originLearningLabel")}</dt>
              <dd className="mt-0.5">
                <Link
                  href={`/agency-brain/learnings/${learning.id}`}
                  className="font-medium text-violet-600 hover:text-violet-800"
                >
                  {learning.title}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {hypothesis.resultSummary ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {hypothesis.resultSummary}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900">{t("executionPlanTitle")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {hypothesis.executionPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {canUpdate ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">{t("updateStatusTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("updateStatusDescription")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((status) => (
              <button
                key={status}
                type="button"
                className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => insights.updateHypothesisStatus(hypothesisId, status)}
              >
                {t(`markAs.${status}`)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
