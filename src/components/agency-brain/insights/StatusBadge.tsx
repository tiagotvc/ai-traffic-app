"use client";

import { useTranslations } from "next-intl";

import type { HypothesisStatus, LearningStatus } from "@/lib/agency-brain/insights/types";

type StatusBadgeProps =
  | { kind: "learning"; status: LearningStatus }
  | { kind: "hypothesis"; status: HypothesisStatus };

const LEARNING_STYLES: Record<LearningStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20",
  weakening: "bg-amber-500/10 text-amber-800 border-amber-500/20",
  archived: "bg-[var(--surface-thead)]0/10 text-[var(--text-dim)] border-[var(--border-color)]"
};

const HYPOTHESIS_STYLES: Record<HypothesisStatus, string> = {
  pending: "bg-[var(--surface-thead)]0/10 text-[var(--text-dim)] border-[var(--border-color)]",
  testing: "bg-amber-500/10 text-amber-800 border-amber-500/20",
  validated: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-800 border-rose-500/20",
  inconclusive: "bg-[rgba(124,58,237,0.06)]0/10 text-[var(--violet)] border-violet-500/20"
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
