"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, Pause, Play, Sparkles } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import { DsModal } from "@/design-system/components/DsModal";
import { useAiCreditCost } from "@/hooks/useAiCreditCost";
import type {
  CreatorBrainInsightPayload,
  CreatorBrainResearchStep
} from "@/lib/campaign-creator/creator-brain-insights";
import { ORION_BRAIN_OPEN_EVENT } from "@/lib/campaign-creator/orion-brain-bridge";
import { formatBRL, formatPercent } from "@/lib/format";

const BRAIN_PAUSED_KEY = "orion-creator-brain-paused";
const BRAIN_CACHE_PREFIX = "orion-creator-brain-cache:";

function readBrainCache(cacheKey: string): CreatorBrainInsightPayload | null {
  try {
    const raw = window.sessionStorage.getItem(BRAIN_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as CreatorBrainInsightPayload;
  } catch {
    return null;
  }
}

function writeBrainCache(cacheKey: string, insight: CreatorBrainInsightPayload) {
  try {
    window.sessionStorage.setItem(BRAIN_CACHE_PREFIX + cacheKey, JSON.stringify(insight));
  } catch {
    /* ignore */
  }
}

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

function primaryMetric(objective: string): CreatorBrainInsightPayload["metric"] {
  if (objective === "leads" || objective === "sales" || objective === "app") return "cpa";
  if (objective === "awareness" || objective === "traffic" || objective === "engagement") return "cpc";
  return "cpa";
}

function resolveTotalSampleCount(insight: CreatorBrainInsightPayload): number {
  if (insight.totalSampleCount > 0) return insight.totalSampleCount;
  return insight.similarCampaignCount + (insight.agencySampleCount ?? 0);
}

function ResearchTimeline({
  steps,
  t
}: {
  steps: CreatorBrainResearchStep[];
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  function stepLabel(step: CreatorBrainResearchStep): string {
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
    if (step.step === "metrics_computed") {
      return t("brainResearchMetricsComputed", { count: step.count ?? 0 });
    }
    if (step.status === "fallback") return t("brainResearchBenchmarkFallback");
    return t("brainResearchBenchmarkDone");
  }

  return (
    <ol className="mt-2 space-y-2">
      {steps.map((step) => (
        <li key={step.step} className="flex items-start gap-2 text-xs text-[var(--text-dim)]">
          <CheckCircle2
            size={14}
            strokeWidth={2.25}
            className={`mt-0.5 shrink-0 ${
              step.status === "fallback"
                ? "text-amber-500"
                : step.status === "done"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--text-dimmer)]"
            }`}
          />
          <span>{stepLabel(step)}</span>
        </li>
      ))}
    </ol>
  );
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
  const benchmarkOnly =
    insight.usesBenchmark &&
    totalSampleCount === 0 &&
    insight.insightVariant === "benchmark_reference";

  if (benchmarkOnly) {
    return (
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t("brainNoSyncedCampaigns")}</p>
    );
  }

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
  const brainCreditCost = useAiCreditCost("creator_brain");
  const { payload, activeNode } = useCampaignDraft();
  const [insight, setInsight] = useState<CreatorBrainInsightPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      setPaused(window.localStorage.getItem(BRAIN_PAUSED_KEY) === "1");
    } catch {
      setPaused(false);
    }
  }, []);

  useEffect(() => {
    function handleOpenRequest() {
      setModalOpen(true);
    }
    window.addEventListener(ORION_BRAIN_OPEN_EVENT, handleOpenRequest);
    return () => window.removeEventListener(ORION_BRAIN_OPEN_EVENT, handleOpenRequest);
  }, []);

  const cacheKey = useMemo(
    () => `${payload.clientSlug ?? ""}|${payload.objective}|${activeNode}`,
    [activeNode, payload.clientSlug, payload.objective]
  );

  useEffect(() => {
    if (paused) {
      setInsight(readBrainCache(cacheKey));
      setLoading(false);
      return;
    }

    const cached = readBrainCache(cacheKey);
    if (cached) {
      setInsight(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      objective: payload.objective,
      activeNode
    });
    if (payload.clientSlug) params.set("clientSlug", payload.clientSlug);

    fetch(`/api/campaign-creator/brain-insights?${params}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; insight?: CreatorBrainInsightPayload }) => {
        if (cancelled) return;
        const next = j.insight ?? null;
        setInsight(next);
        if (next) writeBrainCache(cacheKey, next);
      })
      .catch(() => {
        if (!cancelled) setInsight(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeNode, cacheKey, paused, payload.clientSlug, payload.objective]);

  function togglePaused() {
    const next = !paused;
    setPaused(next);
    try {
      window.localStorage.setItem(BRAIN_PAUSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const metric = insight?.metric ?? primaryMetric(payload.objective);
  const objectiveLabel = t(`objective_${payload.objective}`);
  const hasData = insight?.kind === "data" && insight.marketMedianValue != null;
  const variant = insight?.insightVariant;
  const totalSampleCount = insight ? resolveTotalSampleCount(insight) : 0;
  const researchSteps = insight?.researchSteps ?? insight?.researchLog ?? [];
  const analyzedCampaignNames =
    insight?.analyzedCampaignNames ?? insight?.analyzedCampaigns?.map((c) => c.name) ?? [];
  const benchmarkOnly =
    Boolean(insight?.usesBenchmark && totalSampleCount === 0 && insight.insightVariant === "benchmark_reference");
  const agencyOnlyInsight =
    Boolean(!payload.clientSlug && insight?.insightVariant === "agency_reference" && (insight.agencySampleCount ?? 0) > 0);

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
            ) : benchmarkOnly ? (
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
            <ResearchTimeline steps={researchSteps} t={t} />
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
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-main)]">
            {hasData ? renderInsightText() : renderGuidanceText()}
          </p>
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
            {totalSampleCount > 0 ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={12} strokeWidth={2.25} className="shrink-0" />
                {t("brainSampleBadge", { count: totalSampleCount })}
              </div>
            ) : benchmarkOnly ? (
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-dim)]">{t("brainNoSyncedCampaigns")}</p>
            ) : null}

            {totalSampleCount > 0 ? (
              <div className="mt-2">
                <CampaignsAnalyzedNote insight={insight} agencyOnly={agencyOnlyInsight} t={t} />
              </div>
            ) : null}

            {agencyOnlyInsight && insight.agencySampleCount ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-main)]">
                {t("brainInsightAgencyFound", {
                  objective: objectiveLabel,
                  count: insight.agencySampleCount
                })}
              </p>
            ) : null}

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
                <span className="inline-flex items-center rounded-full border border-[var(--ui-accent)]/35 bg-[var(--ui-accent-muted)] px-3 py-1 text-[11px] font-medium text-[var(--ui-accent)]">
                  {t("brainCreditCostHint", { count: brainCreditCost })}
                </span>
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
          <div className="campaign-creator-sidebar-card-inset mt-3 px-3.5 py-3">
            <p className="text-xs leading-relaxed text-[var(--text-main)]">{renderGuidanceText()}</p>
          </div>
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
