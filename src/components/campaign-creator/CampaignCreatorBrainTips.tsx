"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Pause, Play, Sparkles } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import {
  OrionBrainCardFeedback,
  OrionBrainConsultationSummary,
  OrionBrainResearchChecklist
} from "@/components/campaign-creator/OrionBrainResearchFeedback";
import { AiCreditCostHint } from "@/components/ui/AiCreditCostHint";
import { DsModal } from "@/design-system/components/DsModal";
import { useCreatorBrainInsight } from "@/hooks/useCreatorBrainInsight";
import type { CreatorBrainInsightPayload } from "@/lib/campaign-creator/creator-brain-insights";
import {
  buildCreatorBrainRecommendations,
  type CreatorBrainRecommendation
} from "@/lib/campaign-creator/creator-brain-recommendations";
import { ORION_BRAIN_OPEN_EVENT } from "@/lib/campaign-creator/orion-brain-bridge";
import {
  resolveResearchSteps,
  resolveTotalSampleCount,
  shouldShowBenchmarkFallbackMessage
} from "@/lib/campaign-creator/orion-brain-utils";
import { formatBRL, formatPercent } from "@/lib/format";

function formatMetricValue(metric: CreatorBrainInsightPayload["metric"], value: number, locale: string) {
  if (metric === "ctr") return formatPercent(value, 1, locale === "en" ? "en" : "pt-BR");
  return formatBRL(value, locale === "en" ? "en" : "pt-BR");
}

function metricShortLabelKey(metric: CreatorBrainInsightPayload["metric"]) {
  if (metric === "cpc") return "brainMetricShortCpc";
  if (metric === "ctr") return "brainMetricShortCtr";
  return "brainMetricShortCpa";
}

function referenceAverageLabelKey(
  insight: CreatorBrainInsightPayload,
  metric: CreatorBrainInsightPayload["metric"]
) {
  if (insight.usesBenchmark) {
    if (metric === "cpc") return "brainMarketAverageCpc";
    if (metric === "ctr") return "brainMarketAverageCtr";
    return "brainMarketAverageCpa";
  }
  if (metric === "cpc") return "brainAgencyAverageCpc";
  if (metric === "ctr") return "brainAgencyAverageCtr";
  return "brainAgencyAverageCpa";
}

function ConfidenceBar({ value }: { value: number }) {
  return <CampaignCreatorScoreBar value={value} />;
}

function StatRow({
  label,
  value,
  valueClassName,
  nowrap
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  nowrap?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--border-color)] py-2.5 last:border-b-0 ${nowrap ? "flex-nowrap" : ""}`}
    >
      <span
        className={`text-[11px] text-[var(--text-dimmer)] ${nowrap ? "min-w-0 shrink truncate" : ""}`}
      >
        {label}
      </span>
      <span
        className={`text-right text-xs font-semibold text-[var(--text-main)] ${nowrap ? "shrink-0 whitespace-nowrap" : ""} ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function DataLayerBadges({
  layers,
  t
}: {
  layers: NonNullable<CreatorBrainInsightPayload["dataLayers"]>;
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  const items: string[] = [];
  if (layers.client) items.push(t("brainLayerClient"));
  if (layers.agency) items.push(t("brainLayerAgency"));
  if (layers.benchmark) items.push(t("brainLayerBenchmark"));

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((label) => (
        <span
          key={label}
          className="rounded-full border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-2 py-0.5 text-[10px] font-medium text-[var(--text-dim)]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function formatRecommendationParams(
  rec: CreatorBrainRecommendation,
  locale: string
): Record<string, string | number> {
  const params: Record<string, string | number> = { ...(rec.params ?? {}) };
  const brLocale = locale === "en" ? "en" : "pt-BR";

  for (const key of ["budget", "cpc", "cpa", "median", "minBudget"] as const) {
    if (params[key] != null && typeof params[key] === "number") {
      params[key] = formatBRL(params[key], brLocale);
    }
  }

  return params;
}

function RecommendationsList({
  recommendations,
  t,
  locale,
  compact
}: {
  recommendations: CreatorBrainRecommendation[];
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
  locale: string;
  compact?: boolean;
}) {
  if (!recommendations.length) return null;

  return (
    <ul className={compact ? "mt-2 space-y-1.5" : "mt-2 list-disc space-y-2 pl-4"}>
      {recommendations.map((rec) => (
        <li
          key={rec.key}
          className={`leading-relaxed text-[var(--text-main)] ${compact ? "text-[11px]" : "text-xs"}`}
        >
          {t(rec.key as Parameters<typeof t>[0], formatRecommendationParams(rec, locale))}
        </li>
      ))}
    </ul>
  );
}

function primaryMetric(objective: string): CreatorBrainInsightPayload["metric"] {
  if (objective === "leads" || objective === "sales" || objective === "app") return "cpa";
  if (objective === "awareness" || objective === "traffic" || objective === "engagement") return "cpc";
  return "cpa";
}

function AnalyzedCampaignsList({
  names,
  t
}: {
  names: string[];
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleLimit = 4;
  const visible = expanded ? names : names.slice(0, visibleLimit);
  const hiddenCount = names.length - visibleLimit;

  if (!names.length) return null;

  return (
    <div className="mt-2">
      <ul className="space-y-1">
        {visible.map((name) => (
          <li
            key={name}
            className="truncate text-xs text-[var(--text-dim)]"
            title={name}
          >
            {name}
          </li>
        ))}
      </ul>
      {names.length > visibleLimit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-[11px] font-medium text-[var(--ui-accent)] hover:underline"
        >
          {expanded ? t("brainShowLessCampaigns") : t("brainShowMoreCampaigns", { count: hiddenCount })}
        </button>
      ) : null}
    </div>
  );
}

function CampaignsAnalyzedNote({
  insight,
  agencyOnly,
  t
}: {
  insight: CreatorBrainInsightPayload;
  agencyOnly?: boolean;
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  const totalSampleCount = resolveTotalSampleCount(insight);

  if (shouldShowBenchmarkFallbackMessage(insight)) return null;
  if (totalSampleCount <= 0) return null;

  if (agencyOnly && insight.agencySampleCount) {
    return (
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">
        {t("brainCampaignsAnalyzedAgency", { count: insight.agencySampleCount })}
      </p>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-[var(--text-dim)]">
      {t("brainCampaignsAnalyzed", { count: totalSampleCount })}
    </p>
  );
}

export function CampaignCreatorBrainTips() {
  const t = useTranslations("campaignCreator");
  const locale = useLocale();
  const { payload, activeNode } = useCampaignDraft();
  const { insight, loading, paused, togglePaused } = useCreatorBrainInsight({
    objective: payload.objective,
    activeNode,
    clientSlug: payload.clientSlug
  });
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    function handleOpenRequest() {
      setModalOpen(true);
    }
    window.addEventListener(ORION_BRAIN_OPEN_EVENT, handleOpenRequest);
    return () => window.removeEventListener(ORION_BRAIN_OPEN_EVENT, handleOpenRequest);
  }, []);

  const metric = insight?.metric ?? primaryMetric(payload.objective);
  const objectiveLabel = t(`objective_${payload.objective}`);
  const hasData = insight?.kind === "data" && insight.marketMedianValue != null;
  const variant = insight?.insightVariant;
  const totalSampleCount = insight ? resolveTotalSampleCount(insight) : 0;
  const researchSteps = insight ? resolveResearchSteps(insight) : [];
  const analyzedCampaignNames =
    insight?.analyzedCampaignNames ?? insight?.analyzedCampaigns?.map((c) => c.name) ?? [];
  const agencyOnlyInsight =
    Boolean(!payload.clientSlug && insight?.insightVariant === "agency_reference" && (insight.agencySampleCount ?? 0) > 0);

  const recommendations = insight
    ? buildCreatorBrainRecommendations({
        objective: payload.objective,
        insight,
        draftContext: {
          hasClient: Boolean(payload.clientSlug),
          dailyBudgetBRL: payload.campaign.dailyBudgetBRL,
          activeNode
        }
      })
    : [];

  function renderInsightText() {
    if (!insight) return null;

    if (variant === "client_beats_agency" && insight.improvementPct != null) {
      return (
        <>
          {t("brainInsightSimilarPrefix", { objective: objectiveLabel })}{" "}
          {t(metricShortLabelKey(metric))}{" "}
          <span className="font-semibold text-[var(--success)]">
            {insight.improvementPct < 10
              ? insight.improvementPct.toFixed(1)
              : Math.round(insight.improvementPct)}
            {"% "}
            {t("brainDirectionBetter")}
          </span>
          {insight.agencySampleCount ? (
            <>
              {" "}
              {t("brainInsightVsAgency", { count: insight.agencySampleCount })}
            </>
          ) : null}
          .
        </>
      );
    }

    if (variant === "client_history") {
      return t("brainInsightClientHistory", {
        objective: objectiveLabel,
        count: insight.similarCampaignCount
      });
    }

    if (variant === "agency_reference" && insight.agencySampleCount) {
      if (!payload.clientSlug) {
        return t("brainInsightAgencyFound", {
          objective: objectiveLabel,
          count: insight.agencySampleCount
        });
      }
      return t("brainInsightAgencyBase", {
        objective: objectiveLabel,
        count: insight.agencySampleCount
      });
    }

    return t("brainInsightMarketBase", { objective: objectiveLabel });
  }

  function renderGuidanceText() {
    if (agencyOnlyInsight && insight?.agencySampleCount) {
      return t("brainInsightAgencyFound", {
        objective: objectiveLabel,
        count: insight.agencySampleCount
      });
    }
    if (!payload.clientSlug) return t("brainTipSelectClient");
    if (insight?.guidanceKey) return t(insight.guidanceKey as Parameters<typeof t>[0]);
    return t("brainTipCampaignReady");
  }

  function renderModalContent() {
    if (!insight) return null;

    return (
      <div className="space-y-5">
        {insight.dataLayers ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("brainModalDataSources")}
            </h3>
            <div className="mt-2">
              <DataLayerBadges layers={insight.dataLayers} t={t} />
            </div>
            {insight.usesBenchmark ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">{t("brainBenchmarkNote")}</p>
            ) : insight.agencySampleCount ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">
                {t("brainAgencySampleNote", { count: insight.agencySampleCount, days: insight.windowDays })}
              </p>
            ) : null}
            {totalSampleCount > 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">
                {agencyOnlyInsight && insight.agencySampleCount
                  ? t("brainModalSampleDetailAgency", {
                      count: insight.agencySampleCount,
                      days: insight.windowDays
                    })
                  : t("brainModalSampleDetail", { count: totalSampleCount, days: insight.windowDays })}
              </p>
            ) : shouldShowBenchmarkFallbackMessage(insight) ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">{t("brainNoSyncedCampaigns")}</p>
            ) : null}
            <div className="mt-2">
              <CampaignsAnalyzedNote insight={insight} agencyOnly={agencyOnlyInsight} t={t} />
            </div>
          </section>
        ) : null}

        {researchSteps.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("brainResearchTimeline")}
            </h3>
            <OrionBrainConsultationSummary insight={insight} className="mt-2" />
            <OrionBrainResearchChecklist steps={researchSteps} />
            {analyzedCampaignNames.length ? (
              <div className="mt-3">
                <p className="text-[11px] font-medium text-[var(--text-dimmer)]">
                  {t("brainAnalyzedCampaignsTitle")}
                </p>
                <AnalyzedCampaignsList names={analyzedCampaignNames} t={t} />
              </div>
            ) : null}
          </section>
        ) : null}

        {hasData && insight.marketMedianValue != null ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("brainModalEstimates")}
            </h3>
            <div className="campaign-creator-sidebar-card-inset mt-2 space-y-2 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-dim)]">{t(referenceAverageLabelKey(insight, metric))}</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {formatMetricValue(metric, insight.marketMedianValue, locale)}
                </span>
              </div>
              {insight.estimateLow != null && insight.estimateHigh != null ? (
                <div className="flex flex-nowrap items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 shrink truncate text-[var(--text-dim)]">{t("brainStatForecast")}</span>
                  <span className="shrink-0 whitespace-nowrap font-semibold text-[var(--ui-accent)]">
                    {formatMetricValue(metric, insight.estimateLow, locale)}
                    {" – "}
                    {formatMetricValue(metric, insight.estimateHigh, locale)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-dim)]">{t("brainStatConfidence")}</span>
                <span className="font-semibold text-[var(--text-main)]">{insight.confidence}%</span>
              </div>
              <ConfidenceBar value={insight.confidence} />
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("brainModalRecommendations")}
          </h3>
          {recommendations.length ? (
            <RecommendationsList recommendations={recommendations} t={t} locale={locale} />
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-main)]">
              {hasData ? renderInsightText() : renderGuidanceText()}
            </p>
          )}
          {hasData && insight.referenceCampaignName ? (
            <p className="mt-2 text-xs text-[var(--text-dim)]">
              {t("brainModalBestReference", { name: insight.referenceCampaignName })}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="campaign-creator-sidebar-card" data-orion-brain-tips>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Sparkles size={15} strokeWidth={2.25} />
            </span>
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("brainTipsTitle")}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={togglePaused}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--creator-card-border,var(--border-color))] px-2 py-1 text-[10px] font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))] hover:text-[var(--text-main)]"
              aria-pressed={paused}
              title={paused ? t("brainResume") : t("brainPause")}
            >
              {paused ? <Play size={12} strokeWidth={2.25} /> : <Pause size={12} strokeWidth={2.25} />}
              {paused ? t("brainResume") : t("brainPause")}
            </button>
          </div>
        </div>

        {paused ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{t("brainPausedHint")}</p>
        ) : loading ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{t("brainLoading")}</p>
        ) : hasData && insight ? (
          <>
            <div className="mt-3">
              <OrionBrainCardFeedback insight={insight} compact />
            </div>

            <div className="campaign-creator-sidebar-card-inset mt-3 px-3">
              <StatRow label={t("brainStatObjective")} value={objectiveLabel} />
              <StatRow
                label={t(referenceAverageLabelKey(insight, metric))}
                value={formatMetricValue(metric, insight.marketMedianValue!, locale)}
              />
              {insight.estimateLow != null && insight.estimateHigh != null ? (
                <StatRow
                  label={t("brainStatForecast")}
                  value={`${formatMetricValue(metric, insight.estimateLow, locale)} – ${formatMetricValue(metric, insight.estimateHigh, locale)}`}
                  valueClassName="text-[var(--ui-accent)]"
                  nowrap
                />
              ) : null}
              <div className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[var(--text-dimmer)]">{t("brainStatConfidence")}</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{insight.confidence}%</span>
                </div>
                <div className="mt-2">
                  <ConfidenceBar value={insight.confidence} />
                </div>
              </div>
            </div>

            {!paused ? (
              <div className="mt-3 flex justify-center">
                <AiCreditCostHint
                  kind="creator_brain"
                  variant="pill"
                  consumed
                  consumedAmount={insight.creditCost}
                />
              </div>
            ) : null}

            <button
              type="button"
              data-orion-brain-open
              onClick={() => setModalOpen(true)}
              className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-heading font-semibold"
            >
              {t("brainViewRecommendations")}
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </>
        ) : (
          <>
            {insight ? (
              <div className="mt-3">
                <OrionBrainCardFeedback insight={insight} compact />
              </div>
            ) : null}
            <div className="campaign-creator-sidebar-card-inset mt-3 px-3.5 py-3">
              <p className="text-xs leading-relaxed text-[var(--text-main)]">{renderGuidanceText()}</p>
            </div>
            {insight && !paused ? (
              <div className="mt-3 flex justify-center">
                <AiCreditCostHint
                  kind="creator_brain"
                  variant="pill"
                  consumed
                  consumedAmount={insight.creditCost}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <DsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("brainModalTitle")}
        subtitle={t("brainModalSubtitle")}
        titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
        width="md"
      >
        {renderModalContent()}
      </DsModal>
    </>
  );
}
