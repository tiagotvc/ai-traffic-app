"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  CreatorBrainInsightPayload,
  CreatorBrainResearchStep
} from "@/lib/campaign-creator/creator-brain-insights";
import {
  filterCardResearchSteps,
  filterHighlightResearchSteps,
  isBenchmarkOnly,
  resolveTotalSampleCount,
  shouldShowBenchmarkFallbackMessage
} from "@/lib/campaign-creator/orion-brain-utils";

type CampaignCreatorT = ReturnType<typeof useTranslations<"campaignCreator">>;

function researchStepLabel(step: CreatorBrainResearchStep, t: CampaignCreatorT): string {
  if (step.step === "client_campaigns") {
    if (step.detail === "no_client_selected") return t("brainResearchClientNoClient");
    if (step.status === "done") return t("brainResearchClientDone", { count: step.count ?? 0 });
    return t("brainResearchClientSkipped");
  }
  if (step.step === "agency_search") {
    return t("brainResearchAgencySearch", { count: step.count ?? 0 });
  }
  if (step.step === "agency_matched") {
    if (step.status === "done") return t("brainResearchAgencyMatched", { count: step.count ?? 0 });
    return t("brainResearchAgencySkipped");
  }
  if (step.step === "meta_competitor_search") {
    if (step.detail === "no_client_selected") return t("brainResearchMetaNoClient");
    if (step.detail === "no_competitors") return t("brainResearchMetaNoCompetitors");
    if (step.detail === "api_not_configured") return t("brainResearchMetaApiNotConfigured");
    if (step.status === "done") return t("brainResearchMetaDone", { count: step.count ?? 0 });
    return t("brainResearchMetaSkipped");
  }
  if (step.step === "metrics_computed") {
    return t("brainResearchMetricsComputed", { count: step.count ?? 0 });
  }
  if (step.status === "fallback") return t("brainResearchBenchmarkFallback");
  return t("brainResearchBenchmarkDone");
}

function researchStepIconClass(step: CreatorBrainResearchStep): string {
  if (step.status === "fallback") return "text-amber-500";
  if (step.status === "done") return "text-emerald-600 dark:text-emerald-400";
  return "text-[var(--text-dimmer)]";
}

export function OrionBrainResearchChecklist({
  steps,
  compact = false,
  highlightOnly = false,
  className = ""
}: {
  steps: CreatorBrainResearchStep[];
  compact?: boolean;
  highlightOnly?: boolean;
  className?: string;
}) {
  const t = useTranslations("campaignCreator");
  const visibleSteps = highlightOnly ? filterHighlightResearchSteps(steps) : filterCardResearchSteps(steps);

  if (!visibleSteps.length) return null;

  return (
    <ol className={`space-y-1.5 ${compact ? "" : "mt-2"} ${className}`.trim()}>
      {visibleSteps.map((step) => (
        <li
          key={step.step}
          className={`flex items-start gap-2 ${compact ? "text-[11px]" : "text-xs"} text-[var(--text-dim)]`}
        >
          <CheckCircle2
            size={compact ? 12 : 14}
            strokeWidth={2.25}
            className={`mt-0.5 shrink-0 ${researchStepIconClass(step)}`}
          />
          <span>{researchStepLabel(step, t)}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrionBrainSampleBadge({ count }: { count: number }) {
  const t = useTranslations("campaignCreator");
  if (count <= 0) return null;

  return (
    <div className="campaign-creator-orion-sample-badge">
      <CheckCircle2 size={12} strokeWidth={2.25} className="shrink-0" aria-hidden />
      <span>{t("brainSampleBadge", { count })}</span>
    </div>
  );
}

export function OrionBrainCardFeedback({
  insight,
  compact = false,
  showSampleBadge = true,
  className = ""
}: {
  insight: CreatorBrainInsightPayload;
  compact?: boolean;
  showSampleBadge?: boolean;
  className?: string;
}) {
  const t = useTranslations("campaignCreator");
  const totalSampleCount = resolveTotalSampleCount(insight);
  const benchmarkOnly = isBenchmarkOnly(insight);
  const showFallbackMessage = shouldShowBenchmarkFallbackMessage(insight);

  if (totalSampleCount === 0 && !showFallbackMessage && !showSampleBadge) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {showSampleBadge && totalSampleCount > 0 ? <OrionBrainSampleBadge count={totalSampleCount} /> : null}

      {showFallbackMessage ? (
        <p className={`leading-relaxed text-[var(--text-dim)] ${compact ? "text-[11px]" : "text-xs"}`}>
          {t("brainNoSyncedCampaigns")}
        </p>
      ) : benchmarkOnly && totalSampleCount === 0 ? (
        <p className={`leading-relaxed text-[var(--text-dim)] ${compact ? "text-[11px]" : "text-xs"}`}>
          {t("brainBenchmarkNote")}
        </p>
      ) : null}
    </div>
  );
}
