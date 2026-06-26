"use client";

import { Sparkles, Target, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { cn } from "@/lib/cn";

type Breadth = "narrow" | "balanced" | "broad";

type Props = {
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
  segmentCount?: number;
  validSegmentCount?: number;
  aiInsightSummary?: string | null;
};

function computeBreadth(ageMin: number, ageMax: number, segmentCount: number): Breadth {
  const ageSpan = Math.max(0, ageMax - ageMin);
  if (ageSpan >= 30 || segmentCount <= 2) return "broad";
  if (ageSpan <= 14 && segmentCount >= 5) return "narrow";
  return "balanced";
}

function BreadthGauge({ breadth, t }: { breadth: Breadth; t: ReturnType<typeof useTranslations<"audiences">> }) {
  const positions: Record<Breadth, number> = { narrow: 18, balanced: 50, broad: 82 };
  const label =
    breadth === "narrow"
      ? t("audienceInsightsBreadthNarrow")
      : breadth === "broad"
        ? t("audienceInsightsBreadthBroad")
        : t("audienceInsightsBreadthBalanced");

  return (
    <div className="space-y-2">
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-bg)]">
        <div className="absolute inset-y-0 left-0 w-1/3 rounded-l-full bg-emerald-200/80" />
        <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-200/80" />
        <div className="absolute inset-y-0 right-0 w-1/3 rounded-r-full bg-sky-200/80" />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--ui-accent)] shadow-sm transition-[left]"
          style={{ left: `calc(${positions[breadth]}% - 7px)` }}
          aria-hidden
        />
      </div>
      <p className="text-center text-xs font-semibold text-[var(--text-main)]">{label}</p>
      <div className="flex justify-between text-[9px] text-[var(--text-dimmer)]">
        <span>{t("audienceInsightsBreadthNarrow")}</span>
        <span>{t("audienceInsightsBreadthBalanced")}</span>
        <span>{t("audienceInsightsBreadthBroad")}</span>
      </div>
    </div>
  );
}

export function AudienceCreationInsightsPanel({
  ageMin,
  ageMax,
  gender,
  segmentCount = 0,
  validSegmentCount,
  aiInsightSummary
}: Props) {
  const t = useTranslations("audiences");
  const showAiInsightsPreview = usePlatformFeature("audiences.ai-insights-preview");
  const breadth = computeBreadth(ageMin, ageMax, segmentCount);
  const validatedCount = validSegmentCount ?? segmentCount;

  const genderLabel =
    gender === "male"
      ? t("personaGenderMale")
      : gender === "female"
        ? t("personaGenderFemale")
        : t("personaGenderAll");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Users size={16} strokeWidth={2.25} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("audienceInsightsSummaryTitle")}
            </p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsSummaryHint")}</p>
          </div>
        </div>

        <BreadthGauge breadth={breadth} t={t} />

        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--text-dim)]">{t("personaDemographics")}</dt>
            <dd className="font-medium text-[var(--text-main)]">
              {ageMin}–{ageMax} · {genderLabel}
            </dd>
          </div>
          {segmentCount > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--text-dim)]">{t("personaTargetingSegments")}</dt>
              <dd className="font-medium text-[var(--text-main)]">
                {t("audienceInsightsSegmentCount", {
                  valid: validatedCount,
                  total: segmentCount
                })}
              </dd>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsNoSegmentsYet")}</p>
          )}
        </dl>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4 shadow-sm",
          showAiInsightsPreview
            ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]/40"
            : "border-dashed border-[var(--border-color)] bg-[var(--surface-bg)]"
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              showAiInsightsPreview
                ? "bg-[var(--ui-accent)] text-white"
                : "bg-[var(--surface-card)] text-[var(--text-dimmer)]"
            )}
          >
            <Sparkles size={16} strokeWidth={2.25} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("audienceInsightsAiTitle")}
              <span className="ml-1.5 rounded bg-[var(--surface-bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ui-accent)]">
                Beta
              </span>
            </p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsAiHint")}</p>
          </div>
        </div>

        {showAiInsightsPreview && aiInsightSummary?.trim() ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-[var(--text-dim)]">{aiInsightSummary}</p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsAiDisclaimer")}</p>
          </div>
        ) : showAiInsightsPreview ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <Target size={20} className="text-[var(--text-dimmer)]" strokeWidth={1.75} />
            <p className="text-xs text-[var(--text-dim)]">{t("audienceInsightsAiPreviewEmpty")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Sparkles size={20} className="text-[var(--text-dimmer)]" strokeWidth={1.75} />
            <p className="text-xs font-medium text-[var(--text-dim)]">{t("audienceInsightsAiComingSoon")}</p>
            <p className="max-w-[14rem] text-[10px] text-[var(--text-dimmer)]">
              {t("audienceInsightsAiComingSoonHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
