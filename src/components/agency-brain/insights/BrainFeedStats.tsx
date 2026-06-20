"use client";

import { useTranslations } from "next-intl";

import type { BrainFeedStats } from "@/lib/agency-brain/insights/types";

export function BrainFeedStats({ stats }: { stats: BrainFeedStats }) {
  const t = useTranslations("brainInsights");

  return (
    <p className="text-sm text-[var(--text-dim)]">
      <span className="font-semibold text-[var(--text-main)]">{stats.learningsCount}</span>{" "}
      {t("statsLearnings")}
      <span className="mx-2 text-[var(--text-dimmer)]">•</span>
      <span className="font-semibold text-[var(--text-main)]">{stats.hypothesesTestingCount}</span>{" "}
      {t("statsHypothesesTesting")}
      <span className="mx-2 text-[var(--text-dimmer)]">•</span>
      <span className="font-semibold text-[var(--text-main)]">{stats.highImpactCount}</span>{" "}
      {t("statsHighImpact")}
    </p>
  );
}
