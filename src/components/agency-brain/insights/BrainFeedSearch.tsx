"use client";

import { useTranslations } from "next-intl";

import type { FeedVariant } from "@/lib/agency-brain/insights/types";

export function BrainFeedSearch({
  variant,
  value,
  onChange
}: {
  variant: FeedVariant;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("brainInsights");
  const placeholder =
    variant === "learnings" ? t("searchLearningsPlaceholder") : t("searchHypothesesPlaceholder");

  return (
    <input
      type="search"
      className="ui-input w-full max-w-xs !py-1.5 text-sm"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    />
  );
}
