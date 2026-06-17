"use client";

import { useTranslations } from "next-intl";

import { SUMMARY_CARD_ICONS } from "@/lib/agency-brain/learning-visuals";
import type { BrainSummary } from "@/lib/agency-brain/types";

function SummaryIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function BrainSummaryCards({
  summary,
  compact = false
}: {
  summary: BrainSummary | null;
  compact?: boolean;
}) {
  const t = useTranslations("agencyBrain");

  if (!summary) return null;

  const cards = [
    { key: "total", value: summary.total, label: t("cardTotal") },
    { key: "high", value: summary.highImpact, label: t("cardHighImpact") },
    { key: "creative", value: summary.creativeCount, label: t("cardCreative") },
    { key: "audience", value: summary.audienceCount, label: t("cardAudience") },
    { key: "pending", value: summary.pendingSuggestions, label: t("cardPendingInsights") }
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const icon = SUMMARY_CARD_ICONS[card.key];
          return (
            <div
              key={card.key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${icon?.iconBg ?? "bg-slate-100"}`}
              >
                <SummaryIcon
                  d={icon?.d ?? ""}
                  className={`h-4 w-4 ${icon?.iconColor ?? "text-slate-500"}`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-tight text-slate-900">{card.value}</div>
                <div className="truncate text-[11px] text-slate-500">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const icon = SUMMARY_CARD_ICONS[card.key];
        return (
          <div key={card.key} className="ui-card flex items-center gap-3 p-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${icon?.iconBg ?? "bg-slate-100"}`}
            >
              <SummaryIcon
                d={icon?.d ?? ""}
                className={`h-[18px] w-[18px] ${icon?.iconColor ?? "text-slate-500"}`}
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500">{card.label}</div>
            </div>
          </div>
        );
      })}
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
