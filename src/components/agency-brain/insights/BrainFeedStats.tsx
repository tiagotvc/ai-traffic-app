"use client";

import { useTranslations } from "next-intl";

import type { BrainFeedStats } from "@/lib/agency-brain/insights/types";

export function BrainFeedStats({ stats }: { stats: BrainFeedStats }) {
  const t = useTranslations("brainInsights");

  return (
    <p className="text-sm text-slate-500">
      <span className="font-semibold text-slate-800">{stats.learningsCount}</span>{" "}
      {t("statsLearnings")}
      <span className="mx-2 text-slate-300">•</span>
      <span className="font-semibold text-slate-800">{stats.hypothesesTestingCount}</span>{" "}
      {t("statsHypothesesTesting")}
      <span className="mx-2 text-slate-300">•</span>
      <span className="font-semibold text-slate-800">{stats.highImpactCount}</span>{" "}
      {t("statsHighImpact")}
    </p>
  );
}
