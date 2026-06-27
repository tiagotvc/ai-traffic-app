"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Eye, Sparkles, Target, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import type { DraftTargeting } from "@/lib/campaign-draft";
import {
  computeDraftTargetingAlerts,
  computeTargetingBreadth,
  countDraftTargetingSegments,
  summarizeDraftLocations,
  type TargetingBreadth
} from "@/lib/campaign-targeting-insights";
import { cn } from "@/lib/cn";

type Props = {
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
  segmentCount?: number;
  validSegmentCount?: number;
  aiInsightSummary?: string | null;
  /** When set, shows preview + alerts cards from live draft targeting. */
  targeting?: DraftTargeting;
  layout?: "grid" | "stack";
  showPreview?: boolean;
  showAlerts?: boolean;
  showAiInsignia?: boolean;
  locationLabel?: string | null;
};

function BreadthGauge({
  breadth,
  t
}: {
  breadth: TargetingBreadth;
  t: ReturnType<typeof useTranslations<"audiences">>;
}) {
  const positions: Record<TargetingBreadth, number> = { narrow: 18, balanced: 50, broad: 82 };
  const label =
    breadth === "narrow"
      ? t("audienceInsightsBreadthNarrow")
      : breadth === "broad"
        ? t("audienceInsightsBreadthBroad")
        : t("audienceInsightsBreadthBalanced");

  return (
    <div className="space-y-2">
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-bg)]">
        <div className="absolute inset-y-0 left-0 w-1/3 rounded-l-full bg-emerald-300/90" />
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

function InsightCard({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3.5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AudienceCreationInsightsPanel({
  ageMin,
  ageMax,
  gender,
  segmentCount = 0,
  validSegmentCount,
  aiInsightSummary,
  targeting,
  layout = "grid",
  showPreview = false,
  showAlerts = false,
  showAiInsignia = true,
  locationLabel
}: Props) {
  const t = useTranslations("audiences");
  const showAiInsightsPreview = usePlatformFeature("audiences.ai-insights-preview");
  const effectiveSegmentCount = targeting ? countDraftTargetingSegments(targeting) : segmentCount;
  const breadth = computeTargetingBreadth(ageMin, ageMax, effectiveSegmentCount, targeting);
  const validatedCount = validSegmentCount ?? effectiveSegmentCount;
  const resolvedLocation =
    locationLabel?.trim() || (targeting ? summarizeDraftLocations(targeting) : null);

  const genderLabel =
    gender === "male"
      ? t("personaGenderMale")
      : gender === "female"
        ? t("personaGenderFemale")
        : t("personaGenderAll");

  const alerts =
    showAlerts && targeting
      ? computeDraftTargetingAlerts(targeting, {
          ageWide: t("audienceInsightsAlertAgeWide"),
          radiusWide: (v) => t("audienceInsightsAlertRadiusWide", v),
          noLocation: t("audienceInsightsAlertNoLocation"),
          noInterests: t("audienceInsightsAlertNoInterests")
        })
      : [];

  const rootClass =
    layout === "stack"
      ? "campaign-creator-insights-stack flex flex-col gap-3"
      : "grid gap-3 sm:grid-cols-2";

  return (
    <div className={rootClass}>
      <InsightCard>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Users size={15} strokeWidth={2.25} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("audienceInsightsSummaryTitle")}
            </p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsSummaryHint")}</p>
          </div>
        </div>

        <BreadthGauge breadth={breadth} t={t} />

        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--text-dim)]">{t("personaDemographics")}</dt>
            <dd className="font-medium text-[var(--text-main)]">
              {ageMin}–{ageMax} · {genderLabel}
            </dd>
          </div>
          {effectiveSegmentCount > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--text-dim)]">{t("personaTargetingSegments")}</dt>
              <dd className="font-medium text-[var(--text-main)]">
                {t("audienceInsightsSegmentCount", {
                  valid: validatedCount,
                  total: effectiveSegmentCount
                })}
              </dd>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsNoSegmentsYet")}</p>
          )}
        </dl>
      </InsightCard>

      {showAiInsignia && showAiInsightsPreview ? (
      <InsightCard
        className="border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]/40"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent)] text-white">
            <Sparkles size={15} strokeWidth={2.25} />
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

        {aiInsightSummary?.trim() ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-[var(--text-dim)]">{aiInsightSummary}</p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsAiDisclaimer")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
            <Target size={18} className="text-[var(--text-dimmer)]" strokeWidth={1.75} />
            <p className="text-xs text-[var(--text-dim)]">{t("audienceInsightsAiPreviewEmpty")}</p>
          </div>
        )}
      </InsightCard>
      ) : null}

      {showPreview && targeting ? (
        <InsightCard>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-[var(--ui-accent)]">
              <Eye size={15} strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                {t("audienceInsightsPreviewTitle")}
              </p>
              <p className="text-[10px] text-[var(--text-dimmer)]">{t("audienceInsightsPreviewHint")}</p>
            </div>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--text-dim)]">{t("personaDemographics")}</dt>
              <dd className="font-medium text-[var(--text-main)]">
                {targeting.ageMin}–{targeting.ageMax} ·{" "}
                {targeting.gender === "male"
                  ? t("personaGenderMale")
                  : targeting.gender === "female"
                    ? t("personaGenderFemale")
                    : t("personaGenderAll")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--text-dim)]">{t("audienceInsightsPreviewLocation")}</dt>
              <dd className="max-w-[55%] truncate text-right font-medium text-[var(--text-main)]">
                {resolvedLocation ?? t("audienceInsightsPreviewLocationEmpty")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--text-dim)]">{t("audienceInsightsPreviewInterests")}</dt>
              <dd className="font-medium text-[var(--text-main)]">
                {t("audienceInsightsPreviewInterestsCount", {
                  count: countDraftTargetingSegments(targeting)
                })}
              </dd>
            </div>
          </dl>
        </InsightCard>
      ) : null}

      {showAlerts && targeting ? (
        <InsightCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle size={15} strokeWidth={2.25} />
            </span>
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("audienceInsightsAlertsTitle")}
            </p>
          </div>
          {alerts.length ? (
            <ul className="space-y-1.5">
              {alerts.map((alert) => (
                <li
                  key={alert}
                  className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900"
                >
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" strokeWidth={2.25} />
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--text-dim)]">{t("audienceInsightsAlertsClear")}</p>
          )}
        </InsightCard>
      ) : null}
    </div>
  );
}
