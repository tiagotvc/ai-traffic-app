"use client";

import { useTranslations } from "next-intl";

import type { BrainSummary } from "@/lib/agency-brain/types";

export function BrainSummaryCards({ summary }: { summary: BrainSummary | null }) {
  const t = useTranslations("agencyBrain");

  if (!summary) return null;

  const cards = [
    { key: "total", value: summary.total, label: t("cardTotal") },
    { key: "high", value: summary.highImpact, label: t("cardHighImpact") },
    { key: "creative", value: summary.creativeCount, label: t("cardCreative") },
    { key: "audience", value: summary.audienceCount, label: t("cardAudience") },
    { key: "pending", value: summary.pendingSuggestions, label: t("cardPendingInsights") }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.key} className="ui-card p-4">
          <div className="text-2xl font-bold text-slate-900">{card.value}</div>
          <div className="text-xs text-slate-500">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

export function BrainMemoryExtras({ summary }: { summary: BrainSummary | null }) {
  const t = useTranslations("agencyBrain");

  if (!summary) return null;

  const categories = Object.entries(summary.byCategory).filter(([, count]) => count > 0);
  const hasExtras =
    summary.recentApproved.length > 0 || summary.topTags.length > 0 || categories.length > 0;

  if (!hasExtras) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {summary.recentApproved.length > 0 ? (
        <div className="ui-card p-4">
          <h3 className="text-sm font-semibold text-slate-900">{t("recentApprovedTitle")}</h3>
          <ul className="mt-3 space-y-2">
            {summary.recentApproved.slice(0, 5).map((item) => (
              <li key={item.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.topTags.length > 0 ? (
        <div className="ui-card p-4">
          <h3 className="text-sm font-semibold text-slate-900">{t("topTagsTitle")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.topTags.slice(0, 8).map(({ tag, count }) => (
              <span
                key={tag}
                className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-700"
              >
                {tag} ({count})
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="ui-card p-4">
          <h3 className="text-sm font-semibold text-slate-900">{t("byCategoryTitle")}</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {categories.map(([category, count]) => (
              <li key={category} className="flex justify-between gap-2">
                <span>{t(`category.${category as "CREATIVE"}`)}</span>
                <span className="font-medium text-slate-800">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
