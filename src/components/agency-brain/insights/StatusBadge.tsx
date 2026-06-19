"use client";

import { useTranslations } from "next-intl";

import type { HypothesisStatus, LearningStatus } from "@/lib/agency-brain/insights/types";

type StatusBadgeProps =
  | { kind: "learning"; status: LearningStatus }
  | { kind: "hypothesis"; status: HypothesisStatus };

const LEARNING_STYLES: Record<LearningStatus, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  weakening: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200"
};

const HYPOTHESIS_STYLES: Record<HypothesisStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  testing: "bg-amber-50 text-amber-800 border-amber-200",
  validated: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
  inconclusive: "bg-violet-50 text-violet-800 border-violet-200"
};

export function StatusBadge(props: StatusBadgeProps) {
  const t = useTranslations("brainInsights");

  if (props.kind === "learning") {
    return (
      <span
        className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${LEARNING_STYLES[props.status]}`}
      >
        {t(`learningStatus.${props.status}`)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${HYPOTHESIS_STYLES[props.status]}`}
    >
      {t(`hypothesisStatus.${props.status}`)}
    </span>
  );
}
